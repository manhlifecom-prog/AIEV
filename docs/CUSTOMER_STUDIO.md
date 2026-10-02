# AIEV Studio cho khách hàng

Chế độ khách hàng nằm tại `/studio`, chạy bằng API riêng và database riêng. Khách hàng đăng nhập, gửi yêu cầu cùng link Google Drive, xem báo giá token, nhắn `đồng ý dựng` rồi xem hoặc tải MP4. Có thể nhắn `hủy yêu cầu` trước khi bắt đầu. Lượt chỉnh tiếp theo tạo tác vụ mới, có báo giá riêng.

## Chạy trên máy này

Triển khai tên miền `video.manh.marketing`: xem [bộ triển khai Docker và HTTPS](CUSTOMER_DEPLOYMENT.md).

```powershell
npm ci
npm run customer:dev
```

Mở `http://localhost:6870/studio`. API chỉ lắng nghe loopback ở cổng 6871. Trình khởi động đặt `CUSTOMER_MODE=1`; ở chế độ này, Next chỉ chuyển tiếp `/api/customer/*` và chặn API điều khiển AIEV cá nhân. Trang AIEV cá nhân vẫn chạy như trước với `npm run dev` ở một tiến trình riêng.

Yêu cầu Node.js 22.13+ (khuyến nghị Node 24), FFmpeg/ffprobe có libass và một font có tiếng Việt. Trên Windows, có thể cài riêng FFmpeg bằng helper hiện có:

```powershell
node --input-type=module -e "import {applyFix} from './start/doctor.mjs'; await applyFix('ffmpeg', {log: console.log});"
```

## Kết nối thật và cấu hình kinh doanh

Khóa OpenAI được cấu hình bằng quy trình bảo mật OpenAI Platform của Codex, lưu trong `.env.local` bị Git bỏ qua. Không nhập khóa vào giao diện khách hàng. Khi chưa có khóa hoặc bộ dựng chưa sẵn sàng, API không giữ token và không tạo đơn nạp tiền.

SePay của chủ phần mềm cần một webhook riêng:

- URL: `https://<tên-miền>/api/customer/payments/sepay`.
- Sự kiện: tiền vào tài khoản MB `0383199234`.
- Chứng thực: API Key, gửi header `Authorization: Apikey ...` theo tài liệu SePay.
- Đặt cùng secret đó trong biến `CUSTOMER_SEPAY_WEBHOOK_KEY` của máy chủ. Không đưa secret vào Git hoặc chat.
- Mỗi đơn dùng nội dung chuyển khoản riêng bắt đầu bằng `AIEV`. Nếu SePay đang lọc theo tiền tố khác, thêm tiền tố này hoặc cấu hình webhook riêng.
- Chỉ cộng token khi mã đơn, số tiền, tài khoản, chiều tiền vào và thời hạn đơn đều khớp. Mỗi ID giao dịch chỉ xử lý một lần. Giao dịch lệch hoặc quá hạn được lưu với kết quả `review_required` để đối soát.

Tham chiếu: [SePay webhooks](https://docs.sepay.vn/tich-hop-webhooks.html), [quyền tải Google Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads).

Các giá hiện tại là cấu hình khởi điểm để chủ phần mềm duyệt trước khi bán, không phải giá bán đã được chốt:

| Cấu hình | Mặc định |
| --- | --- |
| `CUSTOMER_TOKEN_PRICE_VND` | 1.000 đồng / token |
| `CUSTOMER_BASE_TOKENS` | 10 token / lượt |
| `CUSTOMER_TOKENS_PER_MINUTE` | 20 token / phút nguồn, làm tròn lên |
| Gói nạp | 100, 500, 1.000 token |
| `CUSTOMER_MAX_VIDEO_SECONDS` | 1.800 giây |
| `CUSTOMER_MAX_VIDEO_BYTES` | 1 GiB |
| `CUSTOMER_ORIGIN` | `http://localhost:6870` |
| `CUSTOMER_DATA_DIR` | `.runtime/customer/` |

Token trong ví là đơn vị dịch vụ của AIEV. Chúng không phải số token đầu vào/đầu ra của OpenAI. Chi phí đang là giá cố định theo phút video nguồn, bao gồm nhận diện lời thoại, lập kế hoạch và dựng. Cần đo chi phí thật và chốt giá trước khi nhận khách trả tiền.

## Những gì đã thực hiện

- Tài khoản bằng email/mật khẩu; hash scrypt, session ngẫu nhiên chỉ lưu hash, cookie HttpOnly và SameSite. Cookie Secure khi `CUSTOMER_ORIGIN` dùng HTTPS.
- Mọi cuộc trò chuyện, tác vụ, ví, đơn nạp và file đầu ra đều kiểm tra chủ sở hữu phía server.
- Nhận file Google Drive có quyền tải bằng link; tải có giới hạn dung lượng, thời gian, DNS và kiểm tra từng chặng chuyển hướng.
- AI nhận transcript có mốc từ, chọn các khoảng thời gian để cắt/ghép, đổi tỷ lệ bằng giữ toàn bộ khung hình, thêm phụ đề từ lời thoại và tiêu đề. AI chỉ trả kế hoạch JSON được kiểm tra; không có quyền shell hay truy cập file tùy ý.
- Dựng draft, kiểm tra thời lượng/kích thước, xuất final MP4; không tự coi draft là thành phẩm.
- Ví và sổ giao dịch cập nhật trong transaction SQLite. Xác nhận lặp không trừ hai lần; lỗi và tác vụ đang chạy khi restart hoàn token một lần. Tác vụ đã xếp hàng tiếp tục sau restart.
- Mỗi khách có tối đa một tác vụ đang nhận hoặc xử lý, ba báo giá chờ xác nhận, 30 yêu cầu/24 giờ. Máy chủ nhận tối đa ba nguồn đồng thời và dựng nối tiếp.

## Giới hạn hiện tại trước khi mở bán

Đây là phiên bản đầu trên một máy chủ. Chưa xác minh cuộc gọi OpenAI thật, chuyển khoản SePay thật hoặc tải một video Drive do chủ phần mềm cung cấp. Chưa triển khai lên máy chủ có tên miền/HTTPS.

Nhận được video thuộc mọi lĩnh vực, nhưng không đồng nghĩa hỗ trợ mọi phép chỉnh sửa. Chưa có kết nối OAuth cho Drive riêng tư, link thư mục, dịch phụ đề, sinh cảnh mới, tạo nhạc, lồng tiếng hay hiểu toàn bộ hình ảnh của video. Mô hình hiện lựa chọn cảnh dựa trên lời thoại và thời gian nguồn. Với video không có tiếng, mô hình chỉ có thông tin thời lượng/kích thước.

Trước khi bán cần hoàn tất khóa AI, cấu hình webhook thật, duyệt giá token, dựng một video khách hàng thật và đối soát một giao dịch nạp thật. Cần máy chủ có CPU/RAM/đĩa đủ cho FFmpeg, HTTPS, backup database/media, giới hạn dung lượng toàn máy và chính sách giữ/xóa file. Chưa có xác minh email, khôi phục mật khẩu, giao diện quản trị đối soát hoặc xóa tài khoản; hiện không vận hành nhiều replica dùng chung database.

Không triển khai worker này lên serverless có giới hạn thời gian xử lý ngắn. Không chạy nhiều tiến trình worker với cùng data directory. Khi mở rộng, cần chuyển ví/queue sang database dùng chung, khóa worker/lease và object storage riêng tư.

## Tài khoản quản trị

Tạo trên máy chủ bằng `node node_modules/tsx/dist/cli.mjs apps/server/src/customer/create-admin.ts <email>`. Lệnh chỉ tạo email chưa tồn tại, sinh mật khẩu ngẫu nhiên và in một lần ra terminal. Không có endpoint công khai cấp quyền admin; tài khoản tự đăng ký luôn là khách hàng. Không đưa mật khẩu vào Git hoặc file cấu hình dùng chung.

Đăng nhập ở `/studio`, chọn **Quản trị** để xem tài khoản, số dư, video và đơn nạp. Bảng quản trị hiện chỉ xem dữ liệu, chưa có điều chỉnh số dư hoặc xử lý đối soát thủ công. Chọn **Đổi mật khẩu** để đặt mật khẩu riêng; hệ thống kiểm tra mật khẩu cũ và đăng xuất mọi session khác. Tài khoản hiện hữu giữ role khách hàng khi database được nâng cấp.

## Kiểm tra

```powershell
npm run customer:test
node node_modules/tsx/dist/cli.mjs --test apps/server/src/customer/customer-render.test.ts
npm run typecheck -w apps/server
npm run typecheck -w apps/web
```

Kiểm tra dựng sử dụng nguồn tổng hợp cục bộ, không gọi AI và không sử dụng video cá nhân. Các kiểm tra thanh toán dùng database trong bộ nhớ và payload giả trong test, không thực hiện chuyển khoản.

Chạy `npm run customer:build` để build server và web. Bảo đảm `CUSTOMER_MODE=1` ở cả lúc build và lúc chạy web, và `CUSTOMER_ORIGIN` là tên miền HTTPS chính xác. Chạy `npm run customer:start` chỉ khởi động chế độ khách hàng, không khởi động backend cá nhân.

Trên checkout GitHub hiện tại, typecheck toàn repo còn lỗi composition `ClaudeTestimonial.tsx` do import transcript sản xuất `video-projects/adasd/assets/transcript.cut.json` không được đưa vào Git. Server, web và renderer khách hàng đã được kiểm tra riêng; chế độ khách hàng dùng pipeline FFmpeg riêng và không import composition đó.
