import Foundation
import WebKit

typealias JSONObject = [String: Any]
enum StudioOrigin {
    static let url = URL(string: "https://video.manh.marketing")!
    static func trusted(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && url.host == "video.manh.marketing" && url.user == nil && url.password == nil && (url.port == nil || url.port == 443)
    }
    static func google(_ url: URL?) -> Bool {
        guard let url, url.scheme == "https", url.user == nil, url.password == nil, url.port == nil else { return false }
        let host = url.host ?? ""
        return ["drive.google.com", "drive.usercontent.google.com", "googleusercontent.com", "www.googleapis.com"].contains(host) || host.hasSuffix(".googleusercontent.com")
    }
}
final class RestrictedRedirects: NSObject, URLSessionTaskDelegate {
    let google: Bool
    init(google: Bool = false) { self.google = google }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        let allowed = google ? StudioOrigin.google(request.url) : StudioOrigin.trusted(request.url)
        // API cookies are never forwarded to Drive or a redirected third-party origin.
        guard allowed, task.countOfBytesReceived == 0 else { completionHandler(nil); return }
        var next = request
        if google { next.setValue(nil, forHTTPHeaderField: "Cookie"); next.setValue(nil, forHTTPHeaderField: "Authorization") }
        completionHandler(next)
    }
}
@MainActor final class NativeAPI {
    weak var web: WKWebView?
    private func session(google: Bool = false) -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false; config.httpCookieStorage = nil
        config.timeoutIntervalForRequest = google ? 60 : 300
        config.timeoutIntervalForResource = google ? 86400 : 600
        return URLSession(configuration: config, delegate: RestrictedRedirects(google: google), delegateQueue: nil)
    }
    private func request(_ endpoint: String, body: JSONObject? = nil, binary: Data? = nil) async throws -> URLRequest {
        guard endpoint.hasPrefix("/"), !endpoint.contains(".."), !endpoint.contains("?"), !endpoint.contains("#"), let web else { throw NativeFailure(message: "App chưa kết nối Studio") }
        let url = StudioOrigin.url.appendingPathComponent("api/customer" + endpoint)
        var request = URLRequest(url: url); request.cachePolicy = .reloadIgnoringLocalCacheData
        let cookies = await web.configuration.websiteDataStore.httpCookieStore.allCookies()
        let selected = cookies.filter { ["video.manh.marketing", ".video.manh.marketing"].contains($0.domain) && url.path.hasPrefix($0.path) && ($0.expiresDate == nil || $0.expiresDate! > Date()) }
        request.allHTTPHeaderFields = HTTPCookie.requestHeaderFields(with: selected)
        request.setValue(StudioOrigin.url.absoluteString, forHTTPHeaderField: "Origin")
        if let binary {
            request.httpMethod = "POST"; request.httpBody = binary
            request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
            request.setValue("m4a", forHTTPHeaderField: "X-AIEV-Audio-Format")
        } else if let body {
            request.httpMethod = "POST"; request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }
    func call(_ endpoint: String, body: JSONObject? = nil, binary: Data? = nil) async throws -> Any {
        let request = try await request(endpoint, body: body, binary: binary), connection = session()
        defer { connection.invalidateAndCancel() }
        let (data, response) = try await connection.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 503
        let result = try? JSONSerialization.jsonObject(with: data)
        guard (200..<300).contains(status) else { throw NativeFailure(message: (result as? JSONObject)?["error"] as? String ?? "Không kết nối được AI", status: status) }
        guard let result else { throw NativeFailure(message: "Phản hồi máy chủ không hợp lệ", status: 503) }
        return result
    }
    func chat(_ body: JSONObject, event: @escaping (JSONObject) -> Void) async throws -> JSONObject {
        var body = body; body["device"] = "ios"; body["deviceVersion"] = "0.6.0"; body["stream"] = true
        let request = try await request("/assistant", body: body), connection = session()
        defer { connection.invalidateAndCancel() }
        return try await withTaskCancellationHandler {
            let (bytes, response) = try await connection.bytes(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 503
            guard (200..<300).contains(status) else {
                var data = Data(); for try await byte in bytes { if data.count < 100_000 { data.append(byte) } }
                let result = (try? JSONSerialization.jsonObject(with: data)) as? JSONObject
                throw NativeFailure(message: result?["error"] as? String ?? "Không kết nối được AI", status: status)
            }
            var result: JSONObject?
            for try await line in bytes.lines {
                try Task.checkCancellation()
                guard line.hasPrefix("data: "), let data = line.dropFirst(6).data(using: .utf8), data.count < 100_000,
                      let frame = try JSONSerialization.jsonObject(with: data) as? JSONObject else { continue }
                if frame["type"] as? String == "error" {
                    let failure = frame["data"] as? JSONObject
                    throw NativeFailure(message: failure?["message"] as? String ?? "AI bị gián đoạn", status: failure?["status"] as? Int ?? 503)
                }
                if frame["type"] as? String == "result" { result = frame["data"] as? JSONObject }
                event(frame)
            }
            guard let result else { throw NativeFailure(message: "Kết nối bị ngắt. Bấm Thử lại để nhận lại tin nhắn này.", status: 503) }
            return result
        } onCancel: { connection.invalidateAndCancel() }
    }
    func downloadDrive(_ link: String, to output: URL) async throws {
        guard let shared = URL(string: link), shared.host == "drive.google.com", StudioOrigin.google(shared),
              let parsed = URLComponents(url: shared, resolvingAgainstBaseURL: false) else { throw NativeFailure(message: "Link Google Drive không hợp lệ") }
        let parts = shared.pathComponents
        let id = parts.count >= 4 && parts[1] == "file" && parts[2] == "d" ? parts[3] : parsed.queryItems?.first(where: { $0.name == "id" })?.value
        guard let id, id.range(of: "^[a-zA-Z0-9_-]{10,200}$", options: .regularExpression) != nil else { throw NativeFailure(message: "Hãy dùng link file video Drive") }
        var url = URLComponents(string: "https://drive.usercontent.google.com/download")!
        url.queryItems = [URLQueryItem(name: "id", value: id), URLQueryItem(name: "export", value: "download"), URLQueryItem(name: "confirm", value: "t")]
        if let key = parsed.queryItems?.first(where: { $0.name == "resourcekey" })?.value {
            guard key.range(of: "^[a-zA-Z0-9_-]{1,200}$", options: .regularExpression) != nil else { throw NativeFailure(message: "Resource key không hợp lệ") }
            url.queryItems?.append(URLQueryItem(name: "resourcekey", value: key))
        }
        let connection = session(google: true); defer { connection.invalidateAndCancel() }
        let (temporary, response) = try await connection.download(for: URLRequest(url: url.url!))
        defer { try? FileManager.default.removeItem(at: temporary) }
        guard StudioOrigin.google(response.url), (response as? HTTPURLResponse)?.statusCode == 200,
              !["text/html", "application/json", "application/xml"].contains(response.mimeType ?? "") else { throw NativeFailure(message: "Không tải được video. Bật quyền 'Bất kỳ ai có đường liên kết' và cho phép tải xuống trong Drive.") }
        try FileManager.default.moveItem(at: temporary, to: output)
    }
}
private extension WKHTTPCookieStore {
    func allCookies() async -> [HTTPCookie] { await withCheckedContinuation { continuation in getAllCookies { continuation.resume(returning: $0) } } }
}
