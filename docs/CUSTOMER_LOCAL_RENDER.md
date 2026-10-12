# Dựng video trên máy khách — Windows 0.2.0

Chế độ production `CUSTOMER_SERVER_RENDER=0` chặn `/chat` và `/videos/:id/confirm` của bộ dựng máy chủ, không chạy queue FFmpeg. Website phục vụ tài khoản, ví và tải app. Không cần nâng gói Vultr để lưu video nguồn.

App Windows đóng gói FFmpeg/ffprobe, tải link Drive hoặc cho khách chọn file trên máy. Nguồn, âm thanh tạm và MP4 nằm trong thư mục `local-videos` của app userData. App báo giá qua API rồi giữ token khi khách bấm xác nhận. Âm thanh MP3 mono 48 kbps được chia thành đoạn tối đa 10 phút, gửi từng đoạn tới API có xác thực, trung chuyển tới OpenAI và không ghi file âm thanh trên VPS. Transcript/mốc từ/kế hoạch và trạng thái tác vụ được lưu ở dịch vụ chung. Khóa OpenAI chỉ ở dịch vụ chung.

AI trả kế hoạch cắt/ghép, tỷ lệ, tiêu đề và phụ đề. FFmpeg dùng CPU/ổ đĩa máy khách xuất draft, kiểm tra rồi xuất final. Bấm **Mở video trên máy** hoặc **Lưu bản sao MP4**; mở cùng tài khoản trên máy khác không mang theo nguồn/MP4. Khách phải giữ app mở trong lúc dựng. Không tự xóa nguồn/MP4 của khách.

Giá local: 10 token mỗi lượt + 20 token mỗi phút nguồn làm tròn lên, không tính phí GiB nguồn vì video không lưu trên VPS. AI chưa trả kế hoạch mà tác vụ thất bại thì hoàn token. Đã nhận kế hoạch thì không hoàn phí AI khi máy khách dựng lỗi, nhưng khách có thể dựng lại cùng kế hoạch miễn phí. Không xác thực bằng phần cứng độ trung thực của metadata do thiết bị báo lên; API giới hạn số đoạn âm thanh theo báo giá, xác thực quyền sở hữu và lưu kết quả từng đoạn để tránh gọi lại khi retry.

App chỉ cho nội dung từ đúng tên miền gọi IPC và chỉ hỗ trợ các tác vụ video định sẵn; không cho web chạy shell, chọn đường dẫn bất kỳ qua IPC hoặc đọc khóa. Mở file đầu ra kiểm tra tài khoản hiện tại và ID do app lưu. Token, thanh toán và quyền tài khoản vẫn kiểm tra ở dịch vụ chung.

Android APK 0.1.0 và iPhone PWA hiện chỉ mở website, chưa có bộ dựng tại máy. Bản chuyển local này không tự chuyển về VPS khi điện thoại thiếu bộ dựng. Windows bộ cài chưa ký Authenticode; chưa xác minh thao tác cài qua giao diện máy khách. Mac/Linux chưa có binary FFmpeg phù hợp trong bộ đóng gói này.

Kiểm tra: 17 test server/media gồm local quyền sở hữu, giữ token một lần, phục hồi tác vụ local và chống dựng trên VPS; hai test chính sách desktop. Luồng điều khiển app đã kiểm tra trên Windows với nguồn lời nói tổng hợp, ví SQLite trong bộ nhớ, OpenAI thật và FFmpeg đóng gói: MP4 4 giây, 1080 × 1080 có âm thanh. Không cộng token giả vào ví production. Chưa kiểm tra video khách 3,4 GB hoàn chỉnh hoặc UI cài đặt native.
