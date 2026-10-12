# Dựng video trên web

Web có bộ dựng FFmpeg WebAssembly một luồng, chạy trong Web Worker trên thiết bị khách. Chat trả lời qua SSE; việc dựng không chặn khách trao đổi với AI. Không cần SharedArrayBuffer hay thay đổi cách cách ly cửa sổ của website.

Khách chọn file/thư mục qua bộ chọn của trình duyệt. AI chỉ nhận danh mục tên, dung lượng và ID nguồn, tối đa 200 mục; một lượt chọn tối đa 50 clip. Video nguồn và MP4 xuất được lưu trong IndexedDB theo tài khoản và ID tác vụ. File xuất chỉ xem được ở trình duyệt đã dựng; khách cần tải về để giữ bản sao. Xóa dữ liệu website/chế độ riêng tư có thể làm mất bản lưu.

Các thao tác: cắt/chọn/sắp xếp đoạn, ghép nhiều clip kể cả khác kích thước hoặc thiếu âm thanh, tỷ lệ dọc/ngang/vuông, tiêu đề và phụ đề ngôn ngữ gốc. Xuất H.264/AAC MP4 ở 1080p. Phụ đề dùng Noto Sans (SIL Open Font License), không phụ thuộc phông chữ hệ điều hành.

Trình duyệt phải hỗ trợ WebAssembly, Worker và IndexedDB trong ngữ cảnh HTTPS (localhost dùng để kiểm thử). Nguồn trên 1 GiB được từ chối trước khi báo giá do giới hạn bộ nhớ của bộ dựng web; nguồn nhỏ hơn vẫn có thể vượt bộ nhớ thực tế của điện thoại. Dùng Windows cho nguồn lớn. Android APK 0.1.0 chưa có bộ chọn file và tải Blob, nên không bật bộ dựng trong WebView này.

Google Drive không bảo đảm cho phép trình duyệt tải file qua CORS. Web hướng dẫn tải nguồn về rồi chọn file/thư mục; không dùng VPS làm proxy tải video. App Windows vẫn tải được Drive trực tiếp. Không cam kết web nhận mọi link Drive trực tiếp.

Máy chủ xác thực, tính token, nhận các đoạn âm thanh nén tối đa 600 giây để chuyển thành lời và tạo kế hoạch AI. Video gốc không gửi lên VPS. Quyền admin do máy chủ xác định, không phải trường device/browserRenderer của khách. Xác nhận chỉ thực hiện sau khi nguồn đã được lưu trên thiết bị. Nếu chưa có kế hoạch, lỗi dùng quy tắc hoàn token hiện tại; có kế hoạch thì lưu lại để dựng lại miễn phí. Hoàn tất chỉ được báo sau khi MP4 kiểm tra đúng thời lượng, kích thước và lưu thành công.

Build: `node scripts/customer-build.mjs` chuẩn bị tài nguyên từ các phiên bản npm đã khóa: @ffmpeg/ffmpeg 0.12.15 (MIT), @ffmpeg/core 0.12.10 (GPL-2.0-or-later). Tài nguyên tạo ở `apps/web/public/studio/renderer`, cần triển khai thư mục này cùng bản Next. Nguồn thư viện: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/ffmpeg ; bộ build core: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10 . Phông chữ và giấy phép nằm trong `apps/web/browser-assets`.

Giữ tab mở khi dựng. Nếu tải lại giữa chừng, bấm tiếp tục để dùng nguồn và kế hoạch đã lưu. Giữ các bản triển khai trước và sao lưu SQLite khi nâng cấp; Windows 1.0.0 không cần cài lại vì giao thức native giữ nguyên.


## Release 1.1.0: editorial selection and inline playback

AI receives up to 24 timestamped JPEG samples (320px, max 28KiB each) together with speech timestamps. Raw video remains on the device. Samples are sent only for the confirmed job; they are not retained in SQLite. The director selects an opening, progression and ending, uses requested duration, and returns validated per-cut framing and crop focus. Sparse samples cannot establish what happened between observations.

Preview is rendered first at 720p and remains available while Full HD is encoded. Final output is 1920×1080, 1080×1920 or 1080×1080, H.264 CRF18 and AAC192kbps. Low-resolution inputs do not gain original detail when upscaled. Old source caches can likewise retain their earlier source resolution; choose the originals for a new job.

Windows 1.1.0 adds account-bound `aiev-media` preview URLs with range support and expiry. Only a known generated preview/final file may be streamed; arbitrary file paths are never accepted. Preview grants preserve one file for the lifetime of a seekable playback session. Existing desktop versions retain the external open/save fallback. API changes remain compatible with older apps which do not send frames.

Validation: 34 API/render tests, 10 native tests, actual Electron protocol range response, and real OpenAI plus browser WebAssembly render. The downloaded 3-second portrait MP4 was decoded at 1080×1920, with blue opening then red ending matching visual instructions, and zero admin debit.
