# Dựng video trên web

Web có bộ dựng FFmpeg WebAssembly một luồng, chạy trong Web Worker trên thiết bị khách. Chat trả lời qua SSE; việc dựng không chặn khách trao đổi với AI. Không cần SharedArrayBuffer hay thay đổi cách cách ly cửa sổ của website.

Khách chọn file/thư mục qua bộ chọn của trình duyệt. AI chỉ nhận danh mục tên, dung lượng và ID nguồn, tối đa 200 mục; một lượt chọn tối đa 50 clip. Video nguồn và MP4 xuất được lưu trong IndexedDB theo tài khoản và ID tác vụ. File xuất chỉ xem được ở trình duyệt đã dựng; khách cần tải về để giữ bản sao. Xóa dữ liệu website/chế độ riêng tư có thể làm mất bản lưu.

Các thao tác: cắt/chọn/sắp xếp đoạn, ghép nhiều clip kể cả khác kích thước hoặc thiếu âm thanh, tỷ lệ dọc/ngang/vuông, tiêu đề và phụ đề ngôn ngữ gốc. Xuất H.264/AAC MP4 ở 720p. Phụ đề dùng Noto Sans (SIL Open Font License), không phụ thuộc phông chữ hệ điều hành.

Trình duyệt phải hỗ trợ WebAssembly, Worker và IndexedDB trong ngữ cảnh HTTPS (localhost dùng để kiểm thử). Nguồn trên 1 GiB được từ chối trước khi báo giá do giới hạn bộ nhớ của bộ dựng web; nguồn nhỏ hơn vẫn có thể vượt bộ nhớ thực tế của điện thoại. Dùng Windows cho nguồn lớn. Android APK 0.1.0 chưa có bộ chọn file và tải Blob, nên không bật bộ dựng trong WebView này.

Google Drive không bảo đảm cho phép trình duyệt tải file qua CORS. Web hướng dẫn tải nguồn về rồi chọn file/thư mục; không dùng VPS làm proxy tải video. App Windows vẫn tải được Drive trực tiếp. Không cam kết web nhận mọi link Drive trực tiếp.

Máy chủ xác thực, tính token, nhận các đoạn âm thanh nén tối đa 600 giây để chuyển thành lời và tạo kế hoạch AI. Video gốc không gửi lên VPS. Quyền admin do máy chủ xác định, không phải trường device/browserRenderer của khách. Xác nhận chỉ thực hiện sau khi nguồn đã được lưu trên thiết bị. Nếu chưa có kế hoạch, lỗi dùng quy tắc hoàn token hiện tại; có kế hoạch thì lưu lại để dựng lại miễn phí. Hoàn tất chỉ được báo sau khi MP4 kiểm tra đúng thời lượng, kích thước và lưu thành công.

Build: `node scripts/customer-build.mjs` chuẩn bị tài nguyên từ các phiên bản npm đã khóa: @ffmpeg/ffmpeg 0.12.15 (MIT), @ffmpeg/core 0.12.10 (GPL-2.0-or-later). Tài nguyên tạo ở `apps/web/public/studio/renderer`, cần triển khai thư mục này cùng bản Next. Nguồn thư viện: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/ffmpeg ; bộ build core: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 . Phông chữ và giấy phép nằm trong `apps/web/browser-assets`.

Giữ tab mở khi dựng. Nếu tải lại giữa chừng, bấm tiếp tục để dùng nguồn và kế hoạch đã lưu. Giữ các bản triển khai trước và sao lưu SQLite khi nâng cấp; Windows 1.0.0 không cần cài lại vì giao thức native giữ nguyên.
