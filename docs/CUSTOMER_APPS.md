# App AIEV Studio

Các app mở dịch vụ https://video.manh.marketing/studio và dùng cùng tài khoản, token và lịch sử. Hội thoại và kế hoạch AI dùng API; Windows/Mac/iOS native dựng video trên thiết bị khách. Video nguồn và MP4 không đồng bộ sang thiết bị khác. App cần Internet để xác thực và gọi AI.

## Bản cài trực tiếp

- Android: APK release 0.1.0, Android 10 trở lên, package marketing.manh.aiev. Nhận link bằng menu Chia sẻ, lưu phiên đăng nhập, xem video và tải MP4 vào Downloads. Chỉ có quyền Internet; không truy cập danh bạ, camera hay micro.
- Windows: bộ cài NSIS 0.5.0 cho Windows 10/11 x64. Preload giới hạn hỗ trợ chat, tiến độ, tải nguồn Drive, dựng FFmpeg và mở/lưu video thuộc tài khoản. Web renderer không có Node.js. Chưa có chứng thư ký mã Windows.
- Mac/iPhone/iPad native 0.6.0: xem [CUSTOMER_APPLE_APPS.md](CUSTOMER_APPLE_APPS.md) về bộ dựng tại thiết bị, CI, gói Mac thử nghiệm và yêu cầu ký iOS. Chưa có TestFlight/App Store.
- Safari/Chrome PWA: lối tắt chat, không có bộ dựng native. Chưa kiểm tra trên thiết bị iOS thật.

Studio có nút Cài app và hướng dẫn theo thiết bị. Gói APK/EXE chỉ xuất hiện khi đã build, kiểm tra và chạy script publish-app-downloads; các gói cài và metadata phát hành không được commit vào Git. Share target chỉ điền nội dung vào ô chat, khách phải nhấn gửi. Service worker chỉ lưu trang mất kết nối; không cache tài khoản, API, token, yêu cầu thanh toán hay video.

## Build Windows

Cài dependencies của apps/desktop bằng npm install --workspaces=false, sau đó từ thư mục gốc chạy:

```sh
node --test apps/desktop/*.test.cjs
node scripts/desktop-build.mjs --win nsis --x64
```

Script tạo package độc lập để không đưa dependencies của workspace vào app. Main chỉ nhận các navigation/download HTTPS đã kiểm tra. Mac dùng DMG/ZIP riêng cho arm64/x64 và bộ FFmpeg phù hợp; kiểm tra bằng workflow Apple apps. Linux chưa build/kiểm thử.

## Build Android

Dùng JDK 17 trở lên, SDK platform android-35 và build-tools 35.0.0, Gradle 8.11.1 và AGP 8.9.2. Đặt sdk.dir trong local.properties, mở apps/mobile/android bằng Android Studio hoặc chạy Gradle assembleRelease. Trên Windows nên build từ thư mục đường dẫn ASCII để tránh lỗi công cụ Android với đường dẫn tiếng Việt.

APK release cần zipalign nếu quy trình đóng gói thay đổi, rồi apksigner sign và apksigner verify. Khóa ký của bản hiện tại ở thư mục riêng C:/Users/manhl/AppData/Local/aiev-build-tools/signing; mật khẩu được bảo vệ bằng Windows DPAPI của tài khoản hiện tại. Không commit hoặc đưa khóa ký vào gói tải xuống. Cần sao lưu khóa và chuẩn bị phương án khôi phục mật khẩu an toàn trước khi cài lại Windows hoặc phát hành lâu dài. Không đổi khóa giữa các phiên bản cập nhật.

## Build iOS native

apps/mobile/ios có SwiftUI/WKWebView, cầu nối native giới hạn và AVFoundation để tải/ghép/cắt/xuất MP4 tại iPhone/iPad. Dùng macOS, Xcode/XcodeGen và tài khoản Apple Developer để ký. scripts/ios-release.sh tạo IPA khi có Team và quyền cấp provisioning. Chưa có IPA/TestFlight/App Store phát hành cho khách; PWA chỉ hỗ trợ chat.

## Phát hành gói cài

```sh
node scripts/publish-app-downloads.mjs /path/AIEV-Studio-Setup-0.5.0.exe /path/AIEV-Studio-0.1.0.apk
node scripts/customer-build.mjs
```

Đưa apps/web/public/studio lên VPS cùng build web. apps.json ghi checksum SHA-256 và đường tải; giữ bản ký Android ở máy build. Nút tải không xuất hiện nếu chưa có metadata phát hành. Google Play/App Store chưa được cấu hình; tài khoản nhà phát triển, ký ứng dụng và xét duyệt do chủ ứng dụng xử lý.
