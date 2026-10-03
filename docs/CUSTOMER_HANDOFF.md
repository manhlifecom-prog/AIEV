# AIEV Studio — bàn giao bản chạy trên VPS

Website: https://video.manh.marketing/studio

## Cách khách hàng dùng

1. Đăng ký tài khoản bằng email và mật khẩu từ 10 ký tự.
2. Mở một **file video** trên Google Drive, cho phép bất kỳ ai có link tải xuống, sao chép link file.
3. Nhắn yêu cầu cùng link, ví dụ: “Cắt từ giây 10 đến giây 40, video dọc 9:16, thêm phụ đề”.
4. AI kiểm tra nguồn và báo giá. Nếu chưa đủ token, mở **Ví token**, chọn gói và chuyển đúng số tiền, đúng nội dung QR.
5. Sau khi token được cộng, nhắn **đồng ý dựng** hoặc bấm **Xác nhận dựng video**. Xem và tải MP4 khi hoàn tất.

Không đặt giới hạn cố định về dung lượng file hoặc thời lượng nguồn; mỗi yêu cầu dùng một file. Máy chủ vẫn kiểm tra dung lượng thực tế trước khi tải và trong khi dựng. Chưa hỗ trợ thư mục Drive, file riêng tư chưa chia sẻ, sinh cảnh video mới hoặc dịch/lồng tiếng. Có cắt/ghép đoạn, đổi tỷ lệ, tiêu đề và phụ đề theo lời thoại. Mỗi lượt chỉnh lại có báo giá riêng.

## Thanh toán và quản trị

- MB `0383199234`, người nhận `NGUYEN VAN MANH`.
- 1 token = 1.000 đồng; gói 100 / 500 / 1.000 token.
- Chi phí dựng = 10 + 20 × số phút nguồn làm tròn lên + làm tròn lên (10 × dung lượng nguồn tính bằng GiB). Hệ thống báo tổng trước khi khách xác nhận. Token dịch vụ khác với token API OpenAI.
- Nội dung chuyển khoản do hệ thống tạo, bắt đầu bằng `AIEV`; không tự nhập lại mã của đơn cũ. Mỗi đơn có hiệu lực 30 phút.
- API kiểm tra mã đơn, số tiền, tài khoản, chiều tiền vào và thời hạn. Gửi lại cùng giao dịch không cộng hai lần. Dựng lỗi hoàn token một lần.
- Admin đăng nhập bằng tài khoản quản trị đã cấp, mở **Quản trị** để xem khách hàng, số dư, tác vụ và đơn nạp. Không có quyền admin khi tự đăng ký tài khoản mới.
- Giao dịch sai số tiền/mã hoặc quá hạn lưu `review_required`; giao diện chưa có công cụ xử lý đối soát thủ công. Cần chủ dịch vụ đối soát khi phát sinh trường hợp này.

## Đã xác minh

- HTTPS, web và API hoạt động trên Vultr; AI, FFmpeg và thanh toán được kích hoạt bằng khóa riêng phía máy chủ.
- Video Drive công khai tải được bằng bộ tải production và đã báo giá trên giao diện thật.
- OpenAI nhận diện lời thoại/lập kế hoạch, FFmpeg xuất MP4 1080 × 1080 có âm thanh/phụ đề và tải có xác thực: chạy thành công trên VPS.
- Kiểm tra ví trong database thử tách biệt: cộng một lần khi webhook gửi lại, giữ đúng token khi xác nhận. Không nạp tiền giả vào ví thật.
- Webhook **AIEV Studio - Nạp token** bật trên SePay; nút **Gửi thử** trả HTTP 200. Lượt thử ID 0 không cộng token.
- 16 kiểm tra API/quyền tài khoản/ví/dung lượng và build web/server thành công, gồm nguồn 601 giây/101 MiB; âm thanh dài được chia từng đoạn 10 phút để nhận diện lời thoại.

Chưa đối soát chuyển khoản ngân hàng thật. Chủ dịch vụ cần thử một đơn nạp của mình, chuyển theo QR và kiểm tra ví tăng đúng một lần trước khi mở bán rộng. Tác vụ này dùng tiền thật nên chủ tài khoản thực hiện.

## Ứng dụng

- Android: https://video.manh.marketing/studio/downloads/AIEV-Studio-0.1.0.apk
- Windows: https://video.manh.marketing/studio/downloads/AIEV-Studio-Setup-0.1.0.exe
- iPhone/iPad: mở website bằng Safari, dùng **Thêm vào Màn hình chính**. Đây là ứng dụng web cài được; chưa có IPA/TestFlight/App Store.
- Chưa xác minh APK trên điện thoại thật hoặc bộ cài Windows qua giao diện máy thật. Bộ cài Windows chưa ký Authenticode.

## Vận hành

- Máy chủ hiện tại: 1 vCPU / 1 GiB RAM, ổ đĩa trống khoảng 900 MiB tại thời điểm kiểm tra. Dựng nối tiếp. Khi thiếu dung lượng, hệ thống dừng nhận tác vụ và kiểm tra trước khi giữ token.
- Cần tăng dung lượng trước khi nhận nhiều khách; chưa có chính sách tự xóa video. Không xóa thư mục hoặc dịch vụ CRM/Zalo đang dùng chung máy.
- Dịch vụ systemd: `aiev-video-api`, `aiev-video-web`. nginx xử lý HTTPS.
- Database/media: `/var/lib/aiev-video`; cấu hình bí mật: `/etc/aiev-video.env` (quyền 600). Không đưa khóa hoặc database khách hàng vào Git.
- Giữ backup SQLite nhất quán; cần bổ sung sao lưu ngoài VPS và kiểm tra phục hồi. Không sao chép riêng file SQLite khi đang ghi mà bỏ qua WAL.
- Chưa có xác minh email, khôi phục mật khẩu qua email, tự đối soát lệch thanh toán hoặc xóa tài khoản. Chủ dịch vụ xử lý hỗ trợ tài khoản hiện tại.

Mã nguồn và bản thay đổi: https://github.com/manhlifecom-prog/AIEV/pull/1
