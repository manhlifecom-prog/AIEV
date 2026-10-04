# Kiểm thử quản trị AIEV — 04/10/2026

## Trạng thái

Web/API hoàn thành và build thành công. **Chưa triển khai production**: phiên Vultr hết hạn; đăng nhập lại bằng Google Life trả `Invalid username/password`. Đã mở tab đăng nhập để người dùng khôi phục phiên. Không cấp tài khoản mới, không đổi mật khẩu Vultr, không thay dữ liệu hay số dư production.

Gói Next production và script kích hoạt/khôi phục đã chuẩn bị trong thư mục `.runtime/deploy` bị Git bỏ qua. Cần đăng nhập Vultr, sao lưu SQLite và bản chạy trên máy chủ, triển khai, rồi kiểm tra website thật bằng dữ liệu riêng. Bản Windows 0.3.0 hiện có không cần build lại.

## Kiểm thử chức năng

- 22 kiểm thử máy chủ/media đạt; 2 kiểm thử policy Windows đạt. TypeScript và Next production build đạt.
- Migration mở database cũ hai lần, giữ tài khoản, hash mật khẩu, vai trò và số dư; thêm trạng thái khóa và nhật ký.
- Admin số dư 0 dựng 32 lượt/ngày được miễn phí; lỗi/thành công/gửi lại không đổi số dư. Một lượt dựng tại máy đang chạy vẫn chặn lượt mới ở cuộc trò chuyện khác.
- Hoàn phí sau thay đổi vai trò dựa trên debit gốc; lượt miễn phí không cộng tiền. Khách hàng vẫn bị trừ và hoàn đúng phí. Retry chat cùng mã sau lỗi hoạt động; replay thành công không gọi AI hoặc tính phí lần nữa.
- API quản trị từ chối khách/phiên thiếu; đăng ký giả role vẫn là customer. Không trả password hoặc bí mật dịch vụ.
- Tìm kiếm, lọc, phân trang 25 mục, chi tiết video `local_running`, chi tiết đơn nạp và nhật ký đều được kiểm tra.
- Điều chỉnh có lý do; replay cùng mã một lần; nội dung khác cùng mã bị từ chối. Không cho âm số dư. Trigger cố ý làm hỏng ghi nhật ký đã chứng minh rollback cả số dư và ledger.
- Khóa thu hồi phiên, chặn đăng nhập; mở lại không khôi phục phiên cũ. Giữ nguyên video đang dựng. Không cho khóa hoặc chỉnh ví admin. SePay vẫn ghi giao dịch hợp lệ cho khách bị khóa, không cộng trùng.
- Doanh thu biểu đồ 7 ngày bằng khoản thực nhận; không gồm điều chỉnh thủ công hoặc lượt miễn phí.

## Luồng thật trên máy kiểm thử

Đã chạy bộ điều khiển Windows hiện có với Electron IPC giả lập, **OpenAI thật và FFmpeg đi kèm thật**, API và ví SQLite riêng trong bộ nhớ. Chào hỏi không mở chọn file; chọn một nguồn tổng hợp an toàn, chat xác nhận, dựng clip 4 giây 1080×1080 có âm thanh/phụ đề, rồi sửa tiếp thành clip 3 giây từ cùng nguồn. Hai lượt hoàn thành, chỉ chọn nguồn một lần, admin vẫn có số dư **0**. Chưa kiểm tra installer UI trên thiết bị vật lý trong lần nâng cấp này.

Kiểm thử trình duyệt dùng CUA/IAB và Chrome trên `http://localhost:6970`, API riêng tại loopback 6871. Toàn bộ khách hàng và khoản thanh toán trong ảnh là **fixture kiểm thử**, không phải số liệu vận hành hoặc giao dịch ngân hàng thật. Đã kiểm tra admin login → dashboard → Studio; chat AI thật → ví ghi ước tính 1/thực trừ 0; tìm kiếm/phân trang → chi tiết → lý do → xác nhận điều chỉnh → số dư mới; khóa/lọc/mở → nhật ký; từ chối số dư âm; dữ liệu trống; trạng thái tải; hồ sơ/đăng xuất; khách đăng nhập về Studio và bị từ chối trang admin. Form đổi mật khẩu được kiểm tra hiển thị; logic xác thực và thu hồi phiên được kiểm thử qua API.

## Đối chiếu thiết kế

Concept: `C:/Users/manhl/.codex/generated_images/01a0faa3-b56a-7dd2-bd98-4c2b6612ff46/exec-ce8fd6a8-d623-4f8d-a571-06fc709ae387.png`.

Ảnh cuối được chụp từ trình duyệt bằng CUA screenshot API, sau khi dữ liệu đã tải. Đã dùng `view_image` để xem concept, ảnh desktop và mobile trong cùng lượt QA. Kích thước concept **1536×1024** được xác nhận bằng viewport thực; kiểm tra thêm **390×844** và kích thước trình duyệt thông thường. Viewport tạm được reset. IAB đã dùng cho luồng tương tác; Chrome dùng để chụp responsive ổn định khi override IAB không còn được áp dụng sau đổi browser.

Ảnh dưới `C:/Users/manhl/.codex/visualizations/2026/10/02/01a0faa3-b56a-7dd2-bd98-4c2b6612ff46/`:

- `admin-dashboard-desktop.png`: bản cuối 1536×1024.
- `admin-dashboard-mobile.png`: bản cuối 390×844.
- `admin-free-token-wallet.png`: chat thật, ví admin miễn phí.

| Điểm so sánh | Concept / bản dựng | Sửa hoặc khác biệt có chủ đích |
| --- | --- | --- |
| Điều hướng | Sidebar 256px, sáu mục, Tổng quan được chọn, hồ sơ dưới cùng | Giữ cấu trúc, thứ tự, nhãn và trạng thái chọn |
| Bố cục | Bốn thống kê → biểu đồ + dịch vụ → bảng video | Giữ thứ tự và bố cục hai cột desktop; số hàng phụ thuộc dữ liệu thật |
| Chữ | Tiêu đề lớn, chữ phụ dịu, số liệu nổi bật, bảng có cấp bậc | Kiểm tra tiêu đề, control, bảng, trạng thái; sửa số tiền bị xuống dòng ở desktop hẹp |
| Màu / container | Nền tối, panel xám xanh, border mảnh, lime cho CTA/đường biểu đồ | Giữ palette và panel; dùng nền phẳng đồng bộ Studio thay lớp glow của concept |
| Icon / thương hiệu | Icon nét, play, khách hàng, video, bánh răng | Sửa icon KPI video/bánh răng và khách hàng; giữ logo Play nét của Studio hiện có |
| Responsive | Không có mockup điện thoại riêng | Mở rộng cùng hệ thống: nav cuộn ngang, thống kê hai cột, bảng cuộn trong container; không tràn trang |
| Biểu đồ | Series minh họa với nhiều nhãn ngày | Vẽ số thực; giảm nhãn ngày, rút gọn đơn vị và tăng chữ mobile; sửa nhãn cuối bị cắt |
| Detail / xác nhận | Concept chính không có màn hình detail | Dùng cùng panel/modal; đóng detail trước khi mở xác nhận để tránh hai dialog và ID trùng |

Copy diff phía trên màn hình: giữ nhãn sáu mục, Tổng quan, Mở Studio, các thống kê, Doanh thu thực thu, Dịch vụ, Hoạt động video, Xem tất cả và Token không giới hạn. Khác biệt cố ý: bỏ phần trăm tăng trưởng và số liệu mẫu; thêm chú thích phạm vi thời gian/dựng tại máy; thay “Hoạt động” bằng “Đã cấu hình” để không giả kết quả kiểm tra dịch vụ; hiển thị ngày hiện tại và giá ước tính thay số phân cảnh không có trong dữ liệu. Nút Chi tiết thay dấu ba chấm để chức năng dễ hiểu. Các control tìm kiếm/phân trang/xác nhận được bổ sung theo yêu cầu đã chốt.

Bản dựng đã được đối chiếu sát concept ở layout, chữ, màu, icon, panel và tương tác, với các khác biệt có chủ đích nêu trên. Không còn lỗi bố cục hoặc chữ bị cắt có thể sửa được trong các kích thước đã kiểm tra. Các thao tác cập nhật dùng API thật trên dữ liệu kiểm thử riêng; không có UI giả hoặc screenshot làm giao diện.
