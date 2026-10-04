import Foundation
import UIKit

private struct LocalRecord: Codable { var directory: String; var owner: String }
@MainActor final class NativeEngine {
    let api = NativeAPI(), media = NativeMedia()
    var activity: (String, JSONObject) -> Void = { _, _ in }
    var selectVideos: () async throws -> [URL] = { throw NativeFailure(message: "Chưa mở được bộ chọn video") }
    var share: (URL) -> Void = { _ in }
    var failure: (String) -> Void = { _ in }
    private var working = false, rendering = false
    private var currentRequest = ""
    private var chatTask: Task<JSONObject, Error>?
    private let root: URL
    private var records: [String: LocalRecord] = [:]
    init() {
        root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("AIEV/local-videos", isDirectory: true)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        if let data = try? Data(contentsOf: root.appendingPathComponent("index.json")) { records = (try? JSONDecoder().decode([String: LocalRecord].self, from: data)) ?? [:] }
        media.activity = { [weak self] label in self?.stage(label) }
    }
    private func stage(_ label: String) { activity(currentRequest, ["type": "status", "data": ["label": label, "cancellable": false]]) }
    private func persist() throws { try JSONEncoder().encode(records).write(to: root.appendingPathComponent("index.json"), options: .atomic) }
    private func directory(_ id: String, owner: String) throws -> URL {
        guard let record = records[id], record.owner == owner, UUID(uuidString: record.directory) != nil else { throw NativeFailure(message: "Video không có trên thiết bị này hoặc không thuộc tài khoản đang đăng nhập") }
        return root.appendingPathComponent(record.directory, isDirectory: true)
    }
    private func owner() async throws -> String {
        guard let account = try await api.call("/me") as? JSONObject, let id = account["id"] as? String else { throw NativeFailure(message: "Hãy đăng nhập trước khi dựng", status: 401) }
        return id
    }
    func cancel(_ id: String) -> Bool { guard id == currentRequest, let chatTask else { return false }; chatTask.cancel(); return true }
    func request(_ endpoint: String, body: JSONObject) async throws -> JSONObject {
        guard !working else { throw NativeFailure(message: "Thiết bị đang xử lý yêu cầu trước", status: 409) }
        working = true
        defer { if !rendering { working = false }; chatTask = nil }
        if endpoint == "/chat" {
            guard let message = body["message"] as? String, !message.isEmpty, message.count <= 8000 else { throw NativeFailure(message: "Yêu cầu không hợp lệ") }
            currentRequest = body["requestId"] as? String ?? UUID().uuidString
            var payload = body; payload["requestId"] = currentRequest
            chatTask = Task { try await api.chat(payload) { [weak self] event in guard let self else { return }; self.activity(self.currentRequest, event) } }
            let decision = try await chatTask!.value; chatTask = nil
            if decision["action"] as? String == "confirm", let jobId = decision["jobId"] as? String {
                let account = try await owner(), dir = try directory(jobId, owner: account)
                _ = try await api.call("/local/\(jobId)/confirm", body: [:]); startRender(jobId, dir: dir); return decision
            }
            guard decision["action"] as? String == "prepare" else { return decision }
            do { return try await prepare(decision) }
            catch { var result = decision; result["localError"] = error.localizedDescription; return result }
        }
        let parts = endpoint.split(separator: "/")
        guard parts.count == 3, parts[0] == "videos", parts[2] == "confirm", UUID(uuidString: String(parts[1])) != nil else { throw NativeFailure(message: "Chức năng không được phép") }
        let id = String(parts[1]), account = try await owner(), dir = try directory(id, owner: account)
        currentRequest = id
        _ = try await api.call("/local/\(id)/confirm", body: [:]); startRender(id, dir: dir)
        return ["success": true]
    }
    private func prepare(_ decision: JSONObject) async throws -> JSONObject {
        let account = try await owner(), dir = root.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var saved = false
        defer { if !saved { try? FileManager.default.removeItem(at: dir) } }
        stage("Chuẩn bị video tại iPhone/iPad")
        let source = dir.appendingPathComponent("source.mp4"), link = decision["url"] as? String
        let metadata: MediaInfo
        if let previousId = decision["sourceJobId"] as? String, records[previousId]?.owner == account {
            let previous = try directory(previousId, owner: account)
            try FileManager.default.copyItem(at: previous.appendingPathComponent("source.mp4"), to: source)
            metadata = try JSONDecoder().decode(MediaInfo.self, from: Data(contentsOf: previous.appendingPathComponent("metadata.json")))
        } else {
            var files = [(URL, String)]()
            if let link {
                if link.range(of: "/drive/(?:u/\\d+/)?folders/", options: .regularExpression) != nil {
                    stage("Đang đọc thư mục Drive")
                    guard let listing = try await api.call("/drive/folder", body: ["url": link]) as? JSONObject, let entries = listing["files"] as? [JSONObject], !entries.isEmpty else { throw NativeFailure(message: "Không có video trong thư mục") }
                    for (index, entry) in entries.enumerated() {
                        guard let url = entry["url"] as? String else { throw NativeFailure(message: "Danh sách Drive không hợp lệ") }
                        let name = entry["name"] as? String ?? "Clip \(index + 1)", file = dir.appendingPathComponent("clip-\(index).mp4")
                        stage("Tải clip \(index + 1)/\(entries.count) về điện thoại: \(name)")
                        try await api.downloadDrive(url, to: file); _ = try await media.probe(file); files.append((file, name))
                    }
                } else { stage("Đang tải video về điện thoại"); let file = dir.appendingPathComponent("clip-0.mp4"); try await api.downloadDrive(link, to: file); files.append((file, "Video Drive")) }
            } else {
                stage("Chọn video trong ứng dụng Tệp")
                let selected = try await selectVideos()
                for (index, input) in selected.enumerated() {
                    let access = input.startAccessingSecurityScopedResource(); defer { if access { input.stopAccessingSecurityScopedResource() } }
                    let file = dir.appendingPathComponent("clip-\(index).mp4")
                    try FileManager.default.copyItem(at: input, to: file); files.append((file, input.lastPathComponent))
                }
            }
            guard !files.isEmpty else { throw NativeFailure(message: "Đã hủy chọn video") }
            if files.count == 1 { try FileManager.default.moveItem(at: files[0].0, to: source); metadata = try await media.probe(source) }
            else { metadata = try await media.merge(files, output: source); for file in files { try? FileManager.default.removeItem(at: file.0) } }
        }
        try JSONEncoder().encode(metadata).write(to: dir.appendingPathComponent("metadata.json"), options: .atomic)
        guard let prompt = decision["prompt"] as? String, let thread = decision["threadId"] as? String, let turn = decision["turnId"] as? String else { throw NativeFailure(message: "Yêu cầu AI thiếu thông tin") }
        let object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(metadata))
        guard let result = try await api.call("/local/quote", body: ["threadId": thread, "turnId": turn, "message": prompt, "url": link ?? "local-file", "metadata": object]) as? JSONObject, let id = result["jobId"] as? String else { throw NativeFailure(message: "Chưa nhận được báo giá") }
        records[id] = LocalRecord(directory: dir.lastPathComponent, owner: account); try persist(); saved = true
        return result
    }
    private func startRender(_ id: String, dir: URL) {
        rendering = true; UIApplication.shared.isIdleTimerDisabled = true
        Task { @MainActor in
            defer { rendering = false; working = false; UIApplication.shared.isIdleTimerDisabled = false }
            do { try await render(id, dir: dir) }
            catch { _ = try? await api.call("/local/\(id)/fail", body: [:]); failure(error.localizedDescription); stage("Dựng bị gián đoạn: \(error.localizedDescription)") }
        }
    }
    private func render(_ id: String, dir: URL) async throws {
        let planFile = dir.appendingPathComponent("plan.json"), source = dir.appendingPathComponent("source.mp4")
        let plan: NativePlan
        if let data = try? Data(contentsOf: planFile) { plan = try JSONDecoder().decode(NativePlan.self, from: data) }
        else {
            let metadata = try JSONDecoder().decode(MediaInfo.self, from: Data(contentsOf: dir.appendingPathComponent("metadata.json")))
            if metadata.hasAudio {
                for index in 0..<Int(ceil(metadata.duration / 600)) {
                    let speech = dir.appendingPathComponent("speech.m4a"), start = Double(index) * 600
                    stage("Nhận diện lời thoại đoạn \(index + 1)")
                    try await media.speech(source, start: start, seconds: min(600, metadata.duration - start), output: speech)
                    _ = try await api.call("/local/\(id)/audio/\(index)", binary: Data(contentsOf: speech)); try FileManager.default.removeItem(at: speech)
                }
            }
            stage("AI đang chọn cảnh và lên kế hoạch dựng")
            let payload = try await api.call("/local/\(id)/plan", body: [:]), data = try JSONSerialization.data(withJSONObject: payload)
            plan = try JSONDecoder().decode(NativePlan.self, from: data); try data.write(to: planFile, options: .atomic)
        }
        // A completed local file survives a failed final acknowledgement; retry never charges again.
        let final = dir.appendingPathComponent("final.mp4")
        if !FileManager.default.fileExists(atPath: final.path) { try await media.render(source, plan: plan, output: final) }
        else {
            let info = try await media.probe(final), expected = plan.edit.segments.reduce(0) { $0 + $1.end - $1.start }
            if info.bytes < 1000 || abs(info.duration - expected) > 1 { try await media.render(source, plan: plan, output: final) }
        }
        _ = try await api.call("/local/\(id)/complete", body: [:]); stage("Video đã lưu trên thiết bị. Bấm Mở video để xem hoặc chia sẻ.")
    }
    func open(_ id: String) async throws {
        let account = try await owner()
        guard let jobs = try await api.call("/videos") as? [JSONObject], jobs.contains(where: { $0["id"] as? String == id && $0["status"] as? String == "done" && $0["output"] as? String == "local.mp4" }) else { throw NativeFailure(message: "Video chưa hoàn tất hoặc không thuộc tài khoản này", status: 403) }
        let file = try directory(id, owner: account).appendingPathComponent("final.mp4")
        guard FileManager.default.fileExists(atPath: file.path) else { throw NativeFailure(message: "Video không có trên iPhone/iPad này") }
        share(file)
    }
}
