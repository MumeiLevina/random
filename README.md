# Thiệp cưới Vườn Sương

Thiệp cưới Quốc Hảo & Thùy Trang, HTML/CSS/JavaScript thuần, không cần framework hoặc build. Website: https://mumeilevina.github.io/thiepcuoi/ · Repo: https://github.com/MumeiLevina/thiepcuoi

## Nội dung hiện tại

- Bữa cơm thân mật ngày 23/11/2026 chỉ hiển thị **nhà gái — Ao Hồ, Tổ dân phố Rừng, Dị Sử, Mỹ Hào, Hưng Yên**, với một link bản đồ tìm theo địa chỉ. Không lặp lại nhà trai trong ngày này; nhà trai được giữ trong lễ thành hôn ngày 24/11 và bản đồ gần cuối trang.
- Tên trên tab và khi chia sẻ: **Quốc Hảo ❤️ Thùy Trang - Thiệp mời cưới**.
- Lễ thành hôn: 24/11/2026, gia đình nhà trai, Thôn Hiển Dương, Dương Quang, Mỹ Hào, Hưng Yên.
- Giữ nguyên thông tin âm lịch và tên hai bên gia đình. Theo yêu cầu, không hiển thị các dòng giờ đón khách/giờ làm lễ sẽ cập nhật; không tự thêm giờ.
- Bản đồ và nút chỉ đường nhà chú rể cùng dùng `20.9388189,106.1072559`. Mục này nằm ngay trước cảnh cảm ơn “Một lời hẹn giữa vườn xanh”.
- Đã bỏ toàn bộ hồi đáp: nút, dialog, mã gửi email và cấu hình FormSubmit. Không cần kích hoạt email hoặc gửi thư thử nữa.

## Nhạc nền

Hai bài nhạc là bản sao nguyên vẹn file người dùng cung cấp: `assets/audio/young-and-beautiful.mp3` (khoảng 3,78 MB) và `assets/audio/mai-mai-ben-nhau.mp3` — Noo Phước Thịnh (khoảng 5,78 MB). Mỗi lần mở thiệp chọn ngẫu nhiên **một bài, xác suất 50/50**. Việc chọn chỉ diễn ra một lần trong lượt mở đó: tắt/bật, thử phát lại hoặc chuyển tab không đổi bài. Reload rồi mở lại sẽ bốc thăm mới, có thể ngẫu nhiên trùng bài trước.

Không chọn, tải hoặc phát nhạc trước thao tác mở (`preload="none"`, không `autoplay`, không gán `src` ban đầu). Chỉ bài được chọn mới tải. Thao tác mở bằng chuột/chạm/Enter/Space bắt đầu phát nhạc, âm lượng mặc định 35%, phát lặp. Nút **Bật nhạc / Tắt nhạc** giữ nguyên; nhãn trợ năng và tooltip cho biết tên bài đã chọn.

Nếu trình duyệt chặn phát, thiệp vẫn mở bình thường, nút cho phép phát thủ công. Rời trang hoặc chuyển sang tab khác sẽ dừng nhạc; khách có thể bật lại. Lỗi tải/phát được xử lý riêng, không làm hỏng animation. Không có chức năng hồi đáp hoặc kết nối email trong bản hiện tại.

## Thiết kế và ảnh

Tên cô dâu/chú rể và phụ huynh hai nhà sử dụng đúng **HLT AphroditeSlimPro** từ ảnh tham chiếu. Font được lưu tại `assets/fonts/HLT-AphroditeSlimPro.woff2` (~227 KB), preload và dùng `font-display: swap`; không phụ thuộc việc cài font trên máy khách. CSS riêng ở `assets/names.css`, chỉ áp dụng cho tên, không đổi font nội dung/địa chỉ/nút. Khoảng cách chữ bằng 0 và khoảng cách dòng được chỉnh cho nét lượn/dấu Việt. Trên màn hình nhỏ, hai gia đình xếp lần lượt để giữ trọn tên phụ huynh. [Nguồn và thông tin font](assets/fonts/SOURCE.md).

Một mẫu Vườn Sương duy nhất: phong bì ivory/sage, dấu sáp H&T, nắp gập 3D và thiệp trượt ra, chuyển sang hero khoảng 3 giây. Có reduced motion, recovery khi animation/JavaScript lỗi, focus bàn phím, reveal, parallax nhẹ và lightbox hỗ trợ ←/→/ESC.

Năm ảnh thật được dùng ở hero, câu chuyện, chương chuyển cảnh và album: NM_00004, NM_00059, NM_00107, NM_00158 và NM_01440. Có bản WebP 699px/420px, lazy loading và kích thước khai báo. Lời kể hiện có vẫn có ghi chú minh họa chờ hai bạn xác nhận.

Mở thiệp luôn ở hero, kể cả reload từ cuối hoặc URL có fragment. Sau mở, khách cuộn và bấm liên kết bình thường. Không có vòng lặp ép cuộn. Đường dẫn cũ `invitations/01-vuon-suong.html` chuyển về trang chính.

## Kiểm tra

Cần Node.js 22+ và một phiên Chrome kiểm thử riêng với cổng 9333, profile `.story-test-profile`. Sau khi mở phiên này, chạy `node verify-invitations.mjs`. Script tự phục vụ nội dung qua HTTP loopback rồi đóng server sau kiểm thử, để font web được tải theo đúng quy tắc origin như website thật. Ví dụ PowerShell:

```powershell
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--remote-debugging-port=9333', "--user-data-dir=$PWD\.story-test-profile", '--no-first-run', 'about:blank')
node verify-invitations.mjs
```

Kiểm tra 320/375/390/768/1440px, landscape 844×390 và màn hình thấp 375×568; mở thiệp, âm thanh thật và bật/tắt, metadata, không hồi đáp, vị trí bản đồ, album, scroll/history, reduced motion và recovery. Bộ test không gửi email. Kết quả tạm ở `verification/`; [báo cáo và ảnh](docs/verification.md) được lưu để review.

Chưa đo FPS hoặc kiểm chứng trên Safari/iOS/điện thoại thật. Giờ cụ thể và lời kể cần gia đình xác nhận nếu muốn cập nhật thêm.
