# Deploy AIEV lên video.manh.marketing

## Trạng thái

Đã chuẩn bị cấu hình máy chủ cho đúng tên miền. Chưa triển khai trực tuyến vì chưa có địa chỉ/quyền truy cập máy chủ. DNS `manh.marketing` được quản lý bởi Vercel. Không đổi các tên miền hoặc dự án CRM đang chạy.

Backend hiện dùng SQLite, file video và worker FFmpeg chạy liên tục. Bộ Docker chạy toàn bộ web/API/renderer trên cùng máy chủ, chỉ công khai HTTP/HTTPS qua Caddy. Không đưa API khách hàng hay backend cá nhân lên Vercel Functions. Frontend riêng trên Vercel có thể bổ sung sau khi có backend HTTPS ổn định.

## Máy chủ và DNS

Máy chủ Linux có Docker Engine và Compose v2, ổ đĩa lưu dữ liệu lâu dài, cổng 80/443 chưa bị dịch vụ khác dùng. Cấu hình stack giới hạn tiến trình dựng ở 2 CPU và 4 GiB RAM; dung lượng đĩa cần tính theo nguồn/tệp xuất và chính sách giữ file. Cần đo bằng video thực tế trước khi mở bán.

Tại DNS Vercel của `manh.marketing`, tạo bản ghi **A** tên `video`, giá trị IPv4 của máy chủ đã chọn. Chỉ tạo AAAA nếu IPv6 thực sự đến đúng máy chủ và mở 80/443. Caddy xin và gia hạn chứng chỉ HTTPS khi DNS đã trỏ đúng. Không có IP mặc định và không thay bản ghi tên miền gốc.

## Khởi chạy trên máy chủ

Clone branch `codex/customer-video-chat`, ghi lại commit đã chọn. Bộ triển khai không gửi dữ liệu, session, mật khẩu hoặc khóa từ máy local lên server.

```sh
cp deploy/customer/production.env.example .env.production
chmod 600 .env.production
docker compose --env-file .env.production -f compose.customer.yaml config --quiet
docker compose --env-file .env.production -f compose.customer.yaml up -d --build
docker compose --env-file .env.production -f compose.customer.yaml ps
```

Đặt khóa OpenAI và webhook SePay qua kênh cấu hình bảo mật trên máy chủ, không đưa vào Git hoặc chat. Có thể chạy web trước với khóa để trống; lúc này xuất bằng AI và nạp tiền vẫn bị khóa. Ngân hàng nhận tiền là MB `0383199234`, tên Mạnh. Webhook sau khi HTTPS hoạt động là `https://video.manh.marketing/api/customer/payments/sepay`.

Tạo admin trong database máy chủ sau khi container healthy:

```sh
docker compose --env-file .env.production -f compose.customer.yaml exec studio node apps/server/dist/customer/create-admin.js admin@aiev.local
```

Mật khẩu sinh ngẫu nhiên chỉ in ra terminal. Admin đã tạo trên máy local không tự chuyển sang database mới. Đăng nhập và đổi mật khẩu riêng. Nếu cần chuyển database local, phải dừng worker, tạo backup nhất quán và kiểm tra dữ liệu trước khi chuyển.

## Kiểm tra và vận hành

- Truy cập `https://video.manh.marketing/studio`; cookie đăng nhập phải có Secure/HttpOnly.
- Kiểm tra `/api/customer/config`, đăng nhập admin, khách thường bị từ chối `/api/customer/admin/overview`, và API cá nhân `/api/health` trả 404.
- Chưa có khóa AI/SePay thì đơn nạp và giữ token phải bị từ chối; không tự coi web online là dịch vụ dựng video đã sẵn sàng.
- Khi kết nối thật, kiểm tra một file Drive, xác nhận qua chat, tải MP4 và một lần nạp thực tế; replay webhook không được cộng hai lần.
- Named volume `customer_data` giữ database/video sau restart. Không dùng `docker compose down -v` khi có dữ liệu. Backup database nhất quán cùng file video và volume TLS; xác minh khôi phục trước khi nhận khách trả tiền.
- Worker chỉ chạy một replica. Theo dõi ổ đĩa, đặt chính sách lưu/xóa video và backup ngoài máy chủ.
- Nếu server đã có reverse proxy, đưa hostname này vào proxy hiện có thay vì khởi động dịch vụ Caddy chiếm cùng cổng.

Healthcheck chỉ xác nhận web, API và FFmpeg; không gọi AI hoặc tạo giao dịch. Trên máy hiện tại chưa có Docker, nên chưa xác nhận image Linux hoặc chứng chỉ live. Tham chiếu: [Docker Compose](https://docs.docker.com/compose/), [Caddy HTTPS](https://caddyserver.com/docs/automatic-https), [giới hạn Vercel Functions](https://vercel.com/docs/functions/limitations).
