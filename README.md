# Thiệp cưới Vườn Sương

Thiệp cưới Quốc Hảo & Thùy Trang, HTML/CSS/JavaScript thuần, không cần framework hoặc build. Website: https://mumeilevina.github.io/thiepcuoi/ · Repo: https://github.com/MumeiLevina/thiepcuoi

## Nội dung hiện tại

- Bữa cơm thân mật ngày 23/11/2026 có hai địa điểm và hai link bản đồ riêng: **nhà gái — Ao Hồ, Tổ dân phố Rừng, Dị Sử, Mỹ Hào, Hưng Yên**; **nhà trai — Thôn Hiển Dương, Dương Quang, Mỹ Hào, Hưng Yên** (cùng địa chỉ lễ thành hôn ngày 24/11). Link nhà gái tìm theo địa chỉ vì chưa có tọa độ riêng được xác nhận; nhà trai dùng đúng tọa độ của bản đồ ngày 24/11.
- Tên trên tab và khi chia sẻ: **Quốc Hảo ❤️ Thùy Trang - Thiệp mời cưới**.
- Lễ thành hôn: 24/11/2026, gia đình nhà trai, Thôn Hiển Dương, Dương Quang, Mỹ Hào, Hưng Yên.
- Giữ nguyên thông tin âm lịch và tên hai bên gia đình. Theo yêu cầu, không hiển thị các dòng giờ đón khách/giờ làm lễ sẽ cập nhật; không tự thêm giờ.
- Bản đồ và nút chỉ đường nhà chú rể cùng dùng `20.9388189,106.1072559`. Mục này nằm ngay trước cảnh cảm ơn “Một lời hẹn giữa vườn xanh”.
- Đã bỏ toàn bộ hồi đáp: nút, dialog, mã gửi email và cấu hình FormSubmit. Không cần kích hoạt email hoặc gửi thư thử nữa.

## Nhạc nền

`assets/audio/young-and-beautiful.mp3` là bản sao nguyên vẹn file “Young And Beautiful.mp3” do người dùng cung cấp, khoảng 3,78 MB. Không tải hoặc phát trước thao tác mở thiệp (`preload="none"`, không `autoplay`). Thao tác mở bằng chuột/chạm/Enter/Space bắt đầu phát nhạc, âm lượng mặc định 35%, phát lặp. Nút cố định **Bật nhạc / Tắt nhạc** có nhãn trợ năng và trạng thái thực tế.

Nếu trình duyệt chặn phát, thiệp vẫn mở bình thường, nút cho phép phát thủ công. Rời trang hoặc chuyển sang tab khác sẽ dừng nhạc; khách có thể bật lại. Lỗi tải/phát được xử lý riêng, không làm hỏng animation. Không có chức năng hồi đáp hoặc kết nối email trong bản hiện tại.

## Thiết kế và ảnh

Một mẫu Vườn Sương duy nhất: phong bì ivory/sage, dấu sáp H&T, nắp gập 3D và thiệp trượt ra, chuyển sang hero khoảng 3 giây. Có reduced motion, recovery khi animation/JavaScript lỗi, focus bàn phím, reveal, parallax nhẹ và lightbox hỗ trợ ←/→/ESC.

Năm ảnh thật được dùng ở hero, câu chuyện, chương chuyển cảnh và album: NM_00004, NM_00059, NM_00107, NM_00158 và NM_01440. Có bản WebP 699px/420px, lazy loading và kích thước khai báo. Lời kể hiện có vẫn có ghi chú minh họa chờ hai bạn xác nhận.

Mở thiệp luôn ở hero, kể cả reload từ cuối hoặc URL có fragment. Sau mở, khách cuộn và bấm liên kết bình thường. Không có vòng lặp ép cuộn. Đường dẫn cũ `invitations/01-vuon-suong.html` chuyển về trang chính.

## Kiểm tra

Cần Node.js 22+ và một phiên Chrome kiểm thử riêng với cổng 9333, profile `.story-test-profile`. Sau khi mở phiên này, chạy `node verify-invitations.mjs`. Ví dụ PowerShell:

```powershell
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--remote-debugging-port=9333', "--user-data-dir=$PWD\.story-test-profile", '--no-first-run', 'about:blank')
node verify-invitations.mjs
```

Kiểm tra 320/375/390/768/1440px, landscape 844×390 và màn hình thấp 375×568; mở thiệp, âm thanh thật và bật/tắt, metadata, không hồi đáp, vị trí bản đồ, album, scroll/history, reduced motion và recovery. Bộ test không gửi email. Kết quả tạm ở `verification/`; [báo cáo và ảnh](docs/verification.md) được lưu để review.

Chưa đo FPS hoặc kiểm chứng trên Safari/iOS/điện thoại thật. Giờ cụ thể và lời kể cần gia đình xác nhận nếu muốn cập nhật thêm.
