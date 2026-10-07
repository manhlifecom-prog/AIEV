import SwiftUI
import WebKit
import AVKit
import UniformTypeIdentifiers
import PhotosUI

@main struct AIEVStudioApp: App {
    var body: some Scene {
        WindowGroup {
            #if DEBUG
            // Hosted media tests exercise the real native engine without
            // starting WebKit or making requests to the production website.
            if ProcessInfo.processInfo.environment["AIEV_MEDIA_TESTS"] == "1" {
                Color.black
            } else {
                StudioView().preferredColorScheme(.dark)
            }
            #else
            StudioView().preferredColorScheme(.dark)
            #endif
        }
    }
}
struct SharedVideo: Identifiable { let id = UUID(); let url: URL }
struct StudioView: View {
    @State private var retry = UUID()
    @State private var offline = false
    @State private var video: SharedVideo?
    @State private var failure: String?
    var body: some View {
        StudioWebView(offline: $offline, video: $video, failure: $failure).id(retry)
            .background(Color(.systemBackground))
            .alert("Chưa kết nối được AIEV", isPresented: $offline) {
                Button("Thử lại") { retry = UUID() }
                Button("Đóng", role: .cancel) {}
            } message: { Text("Kiểm tra kết nối Internet rồi thử lại.") }
            .alert("Dựng tại thiết bị bị gián đoạn", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
                Button("Đóng", role: .cancel) { failure = nil }
            } message: { Text(failure ?? "") }
            .sheet(item: $video) { item in StudioVideoSheet(url: item.url) }
    }
}
struct StudioVideoSheet: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @State private var player: AVPlayer?
    var body: some View {
        NavigationStack {
            VideoPlayer(player: player)
                .onAppear { player = AVPlayer(url: url); player?.play() }
                .onDisappear { player?.pause() }
                .navigationTitle("Video của bạn")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } }
                    ToolbarItem(placement: .primaryAction) { ShareLink(item: url) { Label("Lưu hoặc chia sẻ", systemImage: "square.and.arrow.up") } }
                }
        }
    }
}
struct StudioWebView: UIViewRepresentable {
    @Binding var offline: Bool
    @Binding var video: SharedVideo?
    @Binding var failure: String?
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default(); config.allowsInlineMediaPlayback = true
        config.applicationNameForUserAgent = "AIEViOS/0.7.0"
        config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "aiev")
        if let url = Bundle.main.url(forResource: "native-bridge", withExtension: "js"), let script = try? String(contentsOf: url) {
            config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator; web.isOpaque = false
        web.backgroundColor = .systemBackground; web.scrollView.keyboardDismissMode = .interactive
        context.coordinator.engine.api.web = web
        web.load(URLRequest(url: URL(string: "https://video.manh.marketing/studio?app=ios")!))
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) { web.configuration.userContentController.removeScriptMessageHandler(forName: "aiev", contentWorld: .page) }
    @MainActor class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply, UIDocumentPickerDelegate, PHPickerViewControllerDelegate {
        var parent: StudioWebView
        let engine = NativeEngine()
        private var selected: CheckedContinuation<[URL], Error>?
        init(_ parent: StudioWebView) {
            self.parent = parent; super.init()
            engine.share = { [weak self] url in self?.parent.video = SharedVideo(url: url) }
            engine.failure = { [weak self] message in self?.parent.failure = message }
            engine.selectVideos = { [weak self] in guard let self else { throw NativeFailure(message: "App đã đóng") }; return try await self.pickPhotos() }
            engine.selectFiles = { [weak self] in guard let self else { throw NativeFailure(message: "App đã đóng") }; return try await self.pickVideos() }
            engine.activity = { [weak self] id, event in
                guard let web = self?.engine.api.web, StudioOrigin.trusted(web.url) else { return }
                var value = event; value["requestId"] = id
                web.callAsyncJavaScript("window.__aievActivity(event)", arguments: ["event": value], in: nil, in: .page, completionHandler: nil)
            }
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "https", message.frameInfo.securityOrigin.host == "video.manh.marketing", [0, 443].contains(message.frameInfo.securityOrigin.port), StudioOrigin.trusted(message.webView?.url), let body = message.body as? JSONObject else { replyHandler(nil, "Không được phép"); return }
            Task { @MainActor in
                let method = body["method"] as? String
                do {
                    switch method {
                    case "request":
                        guard let endpoint = body["endpoint"] as? String, let payload = body["body"] as? JSONObject else { throw NativeFailure(message: "Yêu cầu không hợp lệ") }
                        let result = try await engine.request(endpoint, body: payload); replyHandler(["result": result], nil)
                    case "cancel": replyHandler(engine.cancel(body["id"] as? String ?? ""), nil)
                    case "open":
                        guard let id = body["id"] as? String else { throw NativeFailure(message: "Video không hợp lệ") }
                        try await engine.open(id); replyHandler(["success": true], nil)
                    default: throw NativeFailure(message: "Chức năng không được phép")
                    }
                } catch {
                    if method == "request" { replyHandler(["error": error.localizedDescription, "status": (error as? NativeFailure)?.status ?? 400], nil) }
                    else { replyHandler(nil, error.localizedDescription) }
                }
            }
        }
        private func pickPhotos() async throws -> [URL] {
            guard selected == nil, let controller = engine.api.web?.window?.rootViewController else { throw NativeFailure(message: "Chưa mở được thư viện video") }
            return try await withCheckedThrowingContinuation { continuation in
                selected = continuation
                var configuration = PHPickerConfiguration()
                configuration.filter = .videos
                configuration.selectionLimit = 200
                configuration.preferredAssetRepresentationMode = .current
                let picker = PHPickerViewController(configuration: configuration)
                picker.delegate = self
                controller.present(picker, animated: true)
            }
        }
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)
            guard let pending = selected else { return }
            // Keep selection locked while iCloud providers finish copying.
            Task { @MainActor in
                let folder = FileManager.default.temporaryDirectory.appendingPathComponent("AIEV-photo-import-" + UUID().uuidString, isDirectory: true)
                do {
                    guard !results.isEmpty else { throw NativeFailure(message: "Đã hủy chọn video") }
                    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                    var urls: [URL] = []
                    for (index, result) in results.enumerated() {
                        guard result.itemProvider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) else { throw NativeFailure(message: "Nguồn đã chọn không phải video") }
                        let target = folder.appendingPathComponent("clip-\(index).mov")
                        let copied: URL = try await withCheckedThrowingContinuation { continuation in
                            result.itemProvider.loadFileRepresentation(forTypeIdentifier: UTType.movie.identifier) { url, error in
                                do {
                                    if let error { throw error }
                                    guard let url else { throw NativeFailure(message: "Chưa tải được video từ thư viện/iCloud") }
                                    // The provider URL expires when this callback returns.
                                    let name = url.lastPathComponent
                                    let destination = target.deletingLastPathComponent().appendingPathComponent("\(index)-" + name)
                                    try FileManager.default.copyItem(at: url, to: destination)
                                    continuation.resume(returning: destination)
                                } catch { continuation.resume(throwing: error) }
                            }
                        }
                        urls.append(copied)
                    }
                    self.selected = nil; pending.resume(returning: urls)
                } catch {
                    try? FileManager.default.removeItem(at: folder)
                    self.selected = nil; pending.resume(throwing: error)
                }
            }
        }
        private func pickVideos() async throws -> [URL] {
            guard selected == nil, let controller = engine.api.web?.window?.rootViewController else { throw NativeFailure(message: "Chưa mở được bộ chọn video") }
            return try await withCheckedThrowingContinuation { continuation in
                selected = continuation
                let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.movie, .video], asCopy: true)
                picker.allowsMultipleSelection = true; picker.delegate = self
                controller.present(picker, animated: true)
            }
        }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { let pending = selected; selected = nil; pending?.resume(returning: urls) }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { let pending = selected; selected = nil; pending?.resume(throwing: NativeFailure(message: "Đã hủy chọn video")) }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if StudioOrigin.trusted(action.request.url) { decisionHandler(.allow); return }
            if let url = action.request.url, url.scheme == "https", ["drive.google.com", "docs.google.com"].contains(url.host ?? "") { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { if (error as NSError).code != NSURLErrorCancelled { parent.offline = true } }
    }
}
