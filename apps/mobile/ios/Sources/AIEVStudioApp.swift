import SwiftUI
import WebKit

@main struct AIEVStudioApp: App {
    var body: some Scene { WindowGroup { StudioView().preferredColorScheme(.dark) } }
}

struct SharedVideo: Identifiable { let id = UUID(); let url: URL }
struct StudioView: View {
    @State private var retry = UUID()
    @State private var offline = false
    @State private var video: SharedVideo?
    var body: some View {
        StudioWebView(offline: $offline, video: $video).id(retry)
            .background(Color(red: 17/255, green: 19/255, blue: 26/255))
            .alert("Chưa kết nối được AIEV", isPresented: $offline) {
                Button("Thử lại") { retry = UUID() }
                Button("Đóng", role: .cancel) {}
            } message: { Text("App cần Internet để xử lý video. Kiểm tra kết nối rồi thử lại.") }
            .sheet(item: $video) { item in VideoShareSheet(url: item.url) }
    }
}
struct VideoShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: [url], applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
struct StudioWebView: UIViewRepresentable {
    @Binding var offline: Bool
    @Binding var video: SharedVideo?
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.applicationNameForUserAgent = "AIEViOS/0.1.0"
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 17/255, green: 19/255, blue: 26/255, alpha: 1)
        web.load(URLRequest(url: URL(string: "https://video.manh.marketing/studio?app=ios")!))
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }
    class Coordinator: NSObject, WKNavigationDelegate, WKDownloadDelegate {
        var parent: StudioWebView
        var destination: URL?
        init(_ parent: StudioWebView) { self.parent = parent }
        func trusted(_ url: URL?) -> Bool { guard let url else { return false }; return url.scheme == "https" && url.host == "video.manh.marketing" && url.user == nil && url.password == nil && url.port == nil }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard trusted(action.request.url) else {
                if let url = action.request.url, url.scheme == "https", ["drive.google.com", "docs.google.com"].contains(url.host ?? "") { UIApplication.shared.open(url) }
                decisionHandler(.cancel); return
            }
            decisionHandler(action.shouldPerformDownload ? .download : .allow)
        }
        func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            guard trusted(response.response.url) else { decisionHandler(.cancel); return }
            decisionHandler(response.canShowMIMEType ? .allow : response.response.mimeType == "video/mp4" ? .download : .cancel)
        }
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { if (error as NSError).code != NSURLErrorCancelled { parent.offline = true } }
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            guard trusted(response.url), response.mimeType == "video/mp4", response.url?.path.range(of: "^/api/customer/videos/[a-zA-Z0-9-]+/file$", options: .regularExpression) != nil else { completionHandler(nil); return }
            destination = FileManager.default.temporaryDirectory.appendingPathComponent("AIEV-\(UUID().uuidString).mp4")
            completionHandler(destination)
        }
        func download(_ download: WKDownload, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, decisionHandler: @escaping (WKDownload.RedirectPolicy) -> Void) { decisionHandler(trusted(request.url) ? .allow : .cancel) }
        func downloadDidFinish(_ download: WKDownload) { if let destination { parent.video = SharedVideo(url: destination) } }
    }
}
