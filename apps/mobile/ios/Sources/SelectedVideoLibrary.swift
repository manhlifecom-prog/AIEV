import Foundation

/// Account-scoped copies of only the videos explicitly selected by the user.
@MainActor final class SelectedVideoLibrary {
    struct Entry { let id: String; let url: URL; let name: String; let bytes: Int }
    private let root: URL
    private var account = ""
    private(set) var entries: [Entry] = []
    init(root: URL = FileManager.default.temporaryDirectory.appendingPathComponent("AIEV-library-" + UUID().uuidString, isDirectory: true)) { self.root = root }
    func useAccount(_ owner: String) throws {
        if account != owner { try revoke(); account = owner }
    }
    func revoke() throws {
        if FileManager.default.fileExists(atPath: root.path) { try FileManager.default.removeItem(at: root) }
        entries = []
    }
    func replace(_ urls: [URL], owner: String) throws {
        try useAccount(owner)
        guard !urls.isEmpty, urls.count <= 200 else { throw NativeFailure(message: "Chọn từ 1 đến 200 video") }
        let batch = root.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: batch, withIntermediateDirectories: true)
        var next: [Entry] = []
        do {
            for input in urls {
                let scoped = input.startAccessingSecurityScopedResource()
                defer { if scoped { input.stopAccessingSecurityScopedResource() } }
                let id = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
                let name = String(input.lastPathComponent.unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) }.map(String.init).joined().prefix(500))
                let output = batch.appendingPathComponent(id).appendingPathExtension(input.pathExtension)
                try FileManager.default.copyItem(at: input, to: output)
                let bytes = (try output.resourceValues(forKeys: [.fileSizeKey])).fileSize ?? 0
                guard bytes >= 100 else { throw NativeFailure(message: "Video không có dữ liệu: \(name)") }
                next.append(Entry(id: id, url: output, name: name, bytes: bytes))
            }
        } catch { try? FileManager.default.removeItem(at: batch); throw error }
        let old = Set(entries.map { $0.url.deletingLastPathComponent() })
        entries = next
        for directory in old { try? FileManager.default.removeItem(at: directory) }
    }
    func summary() -> JSONObject {
        ["total": entries.count, "truncated": false, "unavailable": [String](),
         "grants": entries.isEmpty ? [] : [["id": "phone", "name": "Video đã chọn trên điện thoại", "folder": false]],
         "files": entries.map { ["id": $0.id, "name": $0.name, "bytes": $0.bytes] as JSONObject }]
    }
    func resolve(_ ids: [String]) throws -> [URL] {
        guard ids.count <= 50, Set(ids).count == ids.count else { throw NativeFailure(message: "Danh sách nguồn không hợp lệ") }
        return try ids.map { id in
            guard let entry = entries.first(where: { $0.id == id }) else { throw NativeFailure(message: "Video chưa được cấp quyền hoặc đã thu hồi") }
            return entry.url
        }
    }
}
