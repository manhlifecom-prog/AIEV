# Quản trị AIEV và miễn token nội bộ

## Sử dụng

Admin đăng nhập tại Studio sẽ được chuyển tới `/studio/admin`. Bảng điều khiển có Tổng quan, Khách hàng, Video, Thanh toán, Lịch sử quản trị và Tài khoản. Nút **Mở Studio** trở lại cuộc trò chuyện. Admin đang ở Studio có thể mở trang quản trị bằng thanh bên hoặc menu tài khoản trên điện thoại.

Quyền miễn token áp dụng cho mọi tài khoản có vai trò `admin` trong SQLite. API `/me` trả `unlimitedTokens` và `blocked`; số dư vẫn là số dư thật. Chat, xác nhận dựng và sửa tiếp ghi khoản thực trừ **0** vào ledger. Giá ước tính của video giữ trong `jobs.tokens`; chat hiện có giá ước tính 1 token, cũng được trả trong lịch sử ví. Chi phí OpenAI thực tế vẫn thuộc chủ hệ thống.

Admin được miễn giới hạn 30 lượt dựng/24 giờ; các kiểm soát tác vụ đồng thời và AI đang trả lời vẫn giữ nguyên. Tài khoản khách hàng giữ cách tính phí hiện tại. App Windows 0.3.0 sử dụng được API/web mới, không cần cài lại.

## Quản lý khách hàng

Danh sách phân trang 25 mục, có tìm kiếm tên/email và lọc tài khoản hoạt động/đã khóa. Chi tiết hiển thị số dư, video, đơn nạp và lịch sử token. Điều chỉnh token và khóa/mở tài khoản cần lý do, sau đó màn hình xác nhận. Chỉ tài khoản khách hàng được thay đổi; không cấp vai trò admin hoặc khóa admin qua API này.

Khóa tài khoản thu hồi mọi phiên và từ chối đăng nhập/yêu cầu mới. Video đang dựng tại máy giữ nguyên trạng thái; mở khóa rồi đăng nhập lại để tiếp tục. Khóa không hoàn phí hoặc thay đổi số dư. Giao dịch SePay hợp lệ vẫn cộng token cho tài khoản đã khóa.

Mỗi thao tác dùng `requestId` duy nhất. Gửi lại cùng nội dung trả kết quả đã lưu; dùng lại mã cho nội dung khác bị từ chối 409. Điều chỉnh số dư, ghi ledger và ghi nhật ký được thực hiện trong cùng giao dịch SQLite. Số dư âm bị từ chối.

## API

Tất cả endpoint `/api/customer/admin/*` xác thực phiên và kiểm tra vai trò từ SQLite ở máy chủ. Danh sách nhận `q`, `status`, `page`; `pageSize` cố định 25.

| Endpoint | Nội dung |
| --- | --- |
| GET `/overview?days=7\|30` | Tổng quan và doanh thu từng ngày theo giờ Việt Nam |
| GET `/customers`, `/customers/:id` | Khách hàng, chi tiết và lịch sử gần đây |
| GET `/videos`, `/videos/:id` | Video; gồm `local_running`, token ước tính/thực trừ |
| GET `/orders`, `/orders/:id` | Đơn nạp, trạng thái hết hạn thực tế, thời điểm nhận tiền |
| GET `/audit` | Người thực hiện, khách hàng, lý do, số dư/trạng thái trước và sau |
| POST `/customers/:id/tokens` | `{ requestId, reason, delta }` |
| POST `/customers/:id/status` | `{ requestId, reason, blocked }` |

Doanh thu là tổng tiền của đơn đã thanh toán có bản ghi `purchase`, theo thời điểm thực nhận trong ledger. Điều chỉnh quản trị, chat và lượt dựng miễn phí không được tính là doanh thu. API không trả password/hash, khóa OpenAI, bí mật SePay hoặc payload giao dịch ngân hàng thô.

## Dữ liệu và hoàn phí

Migration tự thêm `users.blocked DEFAULT 0` và bảng `admin_audit` nếu chưa có; không thay mật khẩu, vai trò hay số dư cũ. Migration có thể chạy lại. Khóa phiên được thực hiện trong cùng giao dịch với nhật ký khóa.

Hoàn phí dựa trên delta thực của bản ghi `reserve`/`chat`. Lượt miễn phí không tạo bản ghi hoàn cộng tiền, kể cả khi tài khoản đổi vai trò sau lượt đó. Lượt đã thanh toán trước khi được nâng thành admin vẫn được hoàn đúng khoản đã trừ khi lỗi thuộc diện hoàn phí. Lượt có kế hoạch AI tiếp tục dùng quy tắc thử dựng lại tại máy hiện có.

## Kiểm thử và triển khai

Chạy `npm run customer:test`, `node --test apps/desktop/policy.test.cjs`, `npm run customer:build`. Bộ kiểm thử bao gồm migration dữ liệu cũ, miễn phí admin số dư 0, giới hạn ngày, giữ kiểm soát tác vụ, hoàn phí sau đổi vai trò, replay chat sau lỗi, quyền truy cập, tìm kiếm/phân trang, điều chỉnh/rollback nguyên tử, khóa/thu hồi phiên, thanh toán SePay trùng và doanh thu thực thu.

Sao lưu SQLite nhất quán, environment và mã chạy trước khi thay bản web/API. Không khôi phục SQLite cũ một cách tự động sau khi đã có thanh toán hoặc thao tác quản trị mới. Bản API cũ không hiểu trạng thái khóa; nếu phải quay lại sau khi đã khóa khách hàng, cần giữ kiểm tra trạng thái khóa hoặc triển khai bản sửa thay vì bật lại quyền truy cập của khách đã khóa.

Kết quả kiểm thử giao diện và trạng thái triển khai được ghi tại [CUSTOMER_ADMIN_QA.md](CUSTOMER_ADMIN_QA.md).
