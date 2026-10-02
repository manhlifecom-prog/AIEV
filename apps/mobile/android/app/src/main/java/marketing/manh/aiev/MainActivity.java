package marketing.manh.aiev;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.*;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String HOST = "video.manh.marketing";
    private WebView web;
    private boolean errorShowing;
    private boolean trusted(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getUserInfo() == null && uri.getPort() == -1;
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xff11131a);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " AIEVAndroid/0.1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (trusted(uri)) return false;
                if (request.isForMainFrame() && "https".equals(uri.getScheme()) && ("drive.google.com".equals(uri.getHost()) || "docs.google.com".equals(uri.getHost()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { Toast.makeText(MainActivity.this, "Chưa mở được trình duyệt", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) { CookieManager.getInstance().flush(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && !errorShowing) {
                    errorShowing = true;
                    new AlertDialog.Builder(MainActivity.this).setTitle("Chưa kết nối được AIEV").setMessage("App cần Internet để xử lý video. Kiểm tra kết nối rồi thử lại.").setPositiveButton("Thử lại", (dialog, which) -> { errorShowing = false; web.loadUrl("https://" + HOST + "/studio?app=android"); }).setNegativeButton("Đóng", (dialog, which) -> { errorShowing = false; finish(); }).setCancelable(false).show();
                }
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, size) -> {
            Uri uri = Uri.parse(url);
            if (!trusted(uri) || uri.getPath() == null || !uri.getPath().matches("/api/customer/videos/[a-zA-Z0-9-]+/file")) return;
            DownloadManager.Request request = new DownloadManager.Request(uri);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) request.addRequestHeader("Cookie", cookies);
            request.addRequestHeader("User-Agent", agent);
            request.setMimeType("video/mp4"); request.setTitle("Video AIEV");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "AIEV-" + System.currentTimeMillis() + ".mp4");
            try { ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request); Toast.makeText(this, "Đang tải video vào Downloads", Toast.LENGTH_LONG).show(); }
            catch (Exception ignored) { Toast.makeText(this, "Chưa tải được video. Hãy thử lại.", Toast.LENGTH_LONG).show(); }
        });
        openIntent(getIntent());
    }
    private void openIntent(Intent intent) {
        String shared = Intent.ACTION_SEND.equals(intent.getAction()) ? intent.getStringExtra(Intent.EXTRA_TEXT) : null;
        Uri.Builder url = Uri.parse("https://" + HOST + "/studio").buildUpon().appendQueryParameter("app", "android");
        if (shared != null) url.appendQueryParameter("share_text", shared.substring(0, Math.min(16000, shared.length())));
        web.loadUrl(url.build().toString());
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); openIntent(intent); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
