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
    private static final int PICK_VIDEOS = 42;
    private ValueCallback<Uri[]> videoSelection;
    private String exportToken;
    private Uri exportUri;
    private java.io.OutputStream exportStream;
    private long exportBytes;
    private synchronized void discardExport() {
        try { if (exportStream != null) exportStream.close(); } catch (Exception ignored) {}
        if (exportUri != null) try { getContentResolver().delete(exportUri, null, null); } catch (Exception ignored) {}
        exportStream = null; exportUri = null; exportToken = null;
    }
    private synchronized void beginExport(String url) {
        if (exportToken != null || !url.startsWith("blob:https://" + HOST + "/") || web.getUrl() == null || !trusted(Uri.parse(web.getUrl()))) return;
        try {
            android.content.ContentValues values = new android.content.ContentValues();
            values.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, "AIEV-" + System.currentTimeMillis() + ".mp4");
            values.put(android.provider.MediaStore.Downloads.MIME_TYPE, "video/mp4");
            values.put(android.provider.MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(android.provider.MediaStore.Downloads.IS_PENDING, 1);
            exportUri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (exportUri == null) throw new java.io.IOException();
            exportStream = getContentResolver().openOutputStream(exportUri);
            if (exportStream == null) throw new java.io.IOException();
            exportToken = java.util.UUID.randomUUID().toString(); exportBytes = 0;
            String token = org.json.JSONObject.quote(exportToken), source = org.json.JSONObject.quote(url);
            // The random capability is issued only in the trusted top-level page
            // after a user download. No file/path API is exposed to the page.
            web.evaluateJavascript("(async()=>{const token=" + token + ";try{const b=await(await fetch(" + source + ")).blob();if(!b.size||b.size>1073741824)throw Error();for(let i=0;i<b.size;i+=65536){const a=new Uint8Array(await b.slice(i,i+65536).arrayBuffer());let s='';for(const n of a)s+=String.fromCharCode(n);if(!AIEVExport.append(token,btoa(s)))throw Error();}AIEVExport.finish(token,true);}catch(e){AIEVExport.finish(token,false);}})()", null);
        } catch (Exception error) { discardExport(); Toast.makeText(this,"Chưa lưu được video",Toast.LENGTH_LONG).show(); }
    }
    public class VideoExport {
        @JavascriptInterface public boolean append(String token, String chunk) {
            synchronized (MainActivity.this) {
                if (exportToken == null || !exportToken.equals(token) || chunk == null || chunk.length() > 90000) return false;
                try {
                    byte[] data = android.util.Base64.decode(chunk, android.util.Base64.NO_WRAP);
                    if (data.length > 65536 || exportBytes + data.length > 1073741824L) { discardExport(); return false; }
                    exportStream.write(data); exportBytes += data.length; return true;
                } catch (Exception error) { discardExport(); return false; }
            }
        }
        @JavascriptInterface public void finish(String token, boolean success) {
            synchronized (MainActivity.this) {
                if (exportToken == null || !exportToken.equals(token)) return;
                boolean saved = false;
                try {
                    if (!success || exportBytes == 0) throw new java.io.IOException();
                    exportStream.close(); exportStream = null;
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
                    if (getContentResolver().update(exportUri, values, null, null) != 1) throw new java.io.IOException();
                    exportUri = null; exportToken = null; saved = true;
                } catch (Exception error) { discardExport(); }
                final boolean complete = saved;
                runOnUiThread(() -> Toast.makeText(MainActivity.this, complete ? "Đã lưu video vào Downloads" : "Chưa lưu được video. Hãy thử lại.", Toast.LENGTH_LONG).show());
            }
        }
    }
    private void cancelSelection() {
        if (videoSelection != null) { videoSelection.onReceiveValue(null); videoSelection = null; }
    }
    private boolean trusted(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getUserInfo() == null && uri.getPort() == -1;
    }
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xff11131a);
        web.addJavascriptInterface(new VideoExport(), "AIEVExport");
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " AIEVAndroid/0.2.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                cancelSelection();
                if (view.getUrl() == null || !trusted(Uri.parse(view.getUrl()))) { callback.onReceiveValue(null); return true; }
                videoSelection = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("video/*");
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    picker = new Intent(android.provider.MediaStore.ACTION_PICK_IMAGES);
                    picker.setType("video/*");
                    picker.putExtra(android.provider.MediaStore.EXTRA_PICK_IMAGES_MAX, Math.min(200, android.provider.MediaStore.getPickImagesMaxLimit()));
                }
                try { startActivityForResult(picker, PICK_VIDEOS); }
                catch (Exception error) { cancelSelection(); Toast.makeText(MainActivity.this, "Chưa mở được thư viện video", Toast.LENGTH_LONG).show(); }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                cancelSelection(); discardExport();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (request.isForMainFrame() && request.hasGesture() && "blob".equals(uri.getScheme())) { beginExport(uri.toString()); return true; }
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
            if (url.startsWith("blob:")) { beginExport(url); return; }
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
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_VIDEOS || videoSelection == null) return;
        ValueCallback<Uri[]> callback = videoSelection; videoSelection = null;
        if (result != RESULT_OK || data == null || web.getUrl() == null || !trusted(Uri.parse(web.getUrl()))) { callback.onReceiveValue(null); return; }
        java.util.ArrayList<Uri> selected = new java.util.ArrayList<>();
        Uri[] candidates = WebChromeClient.FileChooserParams.parseResult(result, data);
        if (candidates != null) for (Uri uri : candidates) {
            // Never accept file:// paths or a provider returning non-video data.
            try {
                String type = getContentResolver().getType(uri);
                if ("content".equals(uri.getScheme()) && type != null && type.startsWith("video/") && !selected.contains(uri)) selected.add(uri);
            } catch (Exception ignored) {}
            if (selected.size() == 200) break;
        }
        callback.onReceiveValue(selected.isEmpty() ? null : selected.toArray(new Uri[0]));
    }
    private void openIntent(Intent intent) {
        String shared = Intent.ACTION_SEND.equals(intent.getAction()) ? intent.getStringExtra(Intent.EXTRA_TEXT) : null;
        Uri.Builder url = Uri.parse("https://" + HOST + "/studio").buildUpon().appendQueryParameter("app", "android");
        if (shared != null) url.appendQueryParameter("share_text", shared.substring(0, Math.min(16000, shared.length())));
        web.loadUrl(url.build().toString());
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); openIntent(intent); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { cancelSelection(); discardExport(); web.removeJavascriptInterface("AIEVExport"); web.destroy(); super.onDestroy(); }
}
