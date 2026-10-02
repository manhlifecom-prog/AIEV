# App AIEV Studio

Các app mở dịch vụ https://video.manh.marketing/studio và dùng cùng backend, tài khoản, token, lịch sử và video. AI chạy trên VPS; app cần Internet. Việc đóng gói app không tự cấp khóa OpenAI, số dư token hay bật thanh toán.

## Bản cài trực tiếp

- Android: APK release 0.1.0, Android 10 trở lên, package marketing.manh.aiev. Nhận link bằng menu Chia sẻ, lưu phiên đăng nhập, xem video và tải MP4 vào Downloads. Chỉ có quyền Internet; không truy cập danh bạ, camera hay micro.
- Windows: bộ cài NSIS 0.1.0 cho Windows 10/11 x64, cài theo tài khoản người dùng, có biểu tượng desktop và Start Menu. Renderer không có Node.js, không có preload hoặc cầu nối IPC. Chỉ lưu tải xuống từ endpoint video của AIEV. Chưa có chứng thư ký mã Windows.
- iPhone/iPad: mở Studio trong Safari, Chia sẻ → Thêm vào Màn hình chính. Bản PWA có biểu tượng và mở độc lập; đã cấu hình manifest, Apple metadata và trang mất kết nối. Chưa kiểm tra trên thiết bị iOS thật.

Studio có nút Cài app và hướng dẫn theo thiết bị. Gói APK/EXE chỉ xuất hiện khi đã build, kiểm tra và chạy script publish-app-downloads; các gói cài và metadata phát hành không được commit vào Git. Share target chỉ điền nội dung vào ô chat, khách phải nhấn gửi. Service worker chỉ lưu trang mất kết nối; không cache tài khoản, API, token, yêu cầu thanh toán hay video.

## Build Windows

Cài dependencies của apps/desktop bằng npm install --workspaces=false, sau đó từ thư mục gốc chạy:

```sh
node --test apps/desktop/policy.test.cjs
node scripts/desktop-build.mjs --win nsis --x64
```

Script tạo package độc lập để không đưa dependencies của workspace vào app. Main chỉ nhận các navigation/download HTTPS đã kiểm tra. Bản macOS/Linux dùng cùng mã nguồn và các target dmg/AppImage; chưa build hoặc kiểm tra các target này.

## Build Android

Dùng JDK 17 trở lên, SDK platform android-35 và build-tools 35.0.0, Gradle 8.11.1 và AGP 8.9.2. Đặt sdk.dir trong local.properties, mở apps/mobile/android bằng Android Studio hoặc chạy Gradle assembleRelease. Trên Windows nên build từ thư mục đường dẫn ASCII để tránh lỗi công cụ Android với đường dẫn tiếng Việt.

APK release cần zipalign nếu quy trình đóng gói thay đổi, rồi apksigner sign và apksigner verify. Khóa ký của bản hiện tại ở thư mục riêng C:/Users/manhl/AppData/Local/aiev-build-tools/signing; mật khẩu được bảo vệ bằng Windows DPAPI của tài khoản hiện tại. Không commit hoặc đưa khóa ký vào gói tải xuống. Cần sao lưu khóa và chuẩn bị phương án khôi phục mật khẩu an toàn trước khi cài lại Windows hoặc phát hành lâu dài. Không đổi khóa giữa các phiên bản cập nhật.

## Build iOS native

apps/mobile/ios có SwiftUI/WKWebView, lưu session, xem video, chia sẻ MP4 tải xuống và xử lý mất kết nối. Dùng macOS, Xcode và XcodeGen để chạy xcodegen generate từ project.yml, rồi chọn Team của chủ ứng dụng để ký. Mã nguồn iOS native chưa được biên dịch hoặc thử trên thiết bị; chưa có IPA, TestFlight hay phát hành App Store. PWA là bản iPhone hiện có thể cài.

## Phát hành gói cài

```sh
node scripts/publish-app-downloads.mjs /path/AIEV-Studio-Setup-0.1.0.exe /path/AIEV-Studio-0.1.0.apk
node scripts/customer-build.mjs
```

Đưa apps/web/public/studio lên VPS cùng build web. apps.json ghi checksum SHA-256 và đường tải; giữ bản ký Android ở máy build. Nút tải không xuất hiện nếu chưa có metadata phát hành. Google Play/App Store chưa được cấu hình; tài khoản nhà phát triển, ký ứng dụng và xét duyệt do chủ ứng dụng xử lý.
