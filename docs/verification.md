# Kiểm chứng Vườn Sương cinematic

Ngày kiểm tra: 08/11/2026. Trình duyệt: Chrome headless 156.0.8078.80 trên Windows. Kết quả máy đọc được: [verification-results.json](verification-results.json).

Lệnh chạy: `node verify-invitations.mjs`. **14 nhóm kiểm tra đạt**, không có lỗi console/runtime/asset nội bộ và không có cảnh báo mạng dịch vụ ngoài trong lần chạy cuối.

| Viewport   | Kết quả            |
| ---------- | ------------------ |
| 320 × 900  | Đạt, mở bằng Enter |
| 375 × 900  | Đạt, mở bằng Space |
| 390 × 900  | Đạt, mở bằng touch |
| 768 × 900  | Đạt                |
| 1440 × 900 | Đạt                |
| 844 × 390  | Đạt, landscape     |
| 375 × 568  | Đạt, màn hình thấp |

Ở mỗi viewport đã kiểm tra: focus ban đầu, giữ focus trong gate, nút mở nằm trong màn hình, phản hồi tức thì, chỉ mở một lần, hoàn tất khoảng 3 giây, xóa overlay, bỏ inert/khóa cuộn, không tự cuộn, tên không chồng lấn, font Việt tải được, không tràn ngang trước/sau mở, giữ toàn bộ thông tin cưới và âm lịch, không thêm giờ giả, Maps cùng tọa độ và không có transform ở phần tử cha, reveal khi cuộn, ảnh không thiếu, lightbox Enter/←/→/ESC/nút đóng, trả focus, RSVP bắt buộc tên và thông báo demo, reload quay về trạng thái hợp lệ.

Các nhánh bổ sung đạt: đường dẫn cũ chuyển về trang chính, reduced motion mở tức thì, CSS animation bị hủy hoặc tắt vẫn giải phóng thiệp, runtime lỗi mở nội dung, thiếu IntersectionObserver vẫn hiện toàn bộ nội dung và JavaScript bị tắt vẫn đọc được thiệp.

Đã xem screenshot và sửa overflow ở lớp nền phong bì trước khi chạy lại toàn bộ kiểm thử. Chưa kiểm chứng Safari/iOS, trình duyệt cũ, thiết bị thật, độ mượt/FPS trên điện thoại hoặc thao tác kéo/zoom trong Google Maps bằng thiết bị thật. Bản đồ đã được kiểm tra URL, kích thước và cấu trúc không chặn tương tác. RSVP chưa có backend theo đúng yêu cầu.

## Desktop

![Phong bì](screenshots/1440-envelope.webp)

![Mở thiệp: dấu sáp đã tách, nắp gập và thiệp trượt lên](screenshots/1440-opening.webp)

![Hero sau khi mở](screenshots/1440-hero.webp)

![Hai khung lịch cưới](screenshots/1440-schedule.webp)

## Mobile

| Phong bì                                          | Đang mở                                          | Hero                                      |
| ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| ![Phong bì mobile](screenshots/390-envelope.webp) | ![Mở thiệp mobile](screenshots/390-opening.webp) | ![Hero mobile](screenshots/390-hero.webp) |

Ảnh dùng trong thiệp vẫn là ảnh minh họa hiện có; không phải ảnh cưới đã được gia đình xác nhận.
