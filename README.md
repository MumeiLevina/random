# Thiệp cưới Vườn Sương

Thiệp cưới của Quốc Hảo và Thùy Trang. Trang chạy trực tiếp từ `index.html` và không cần cài thư viện hay chạy lệnh build. Đường dẫn cũ `invitations/01-vuon-suong.html` chuyển về trang chính.

## Nhà chú rể

Mục **Nhà chú rể** trong `index.html` hiển thị bản đồ và nút **Chỉ đường trên Google Maps**. Khi đổi địa điểm, cập nhật cùng một cặp tọa độ cho tham số `q` của bản đồ nhúng và `destination` của nút chỉ đường.

## Nội dung cần cập nhật

Điền giờ đón khách và giờ làm lễ ở hai mục tương ứng trong lịch cưới khi gia đình xác nhận. Trang đã sử dụng 5 ảnh cưới thật do gia đình cung cấp. Lời kể/lời hẹn hiện có vẫn chờ hai bạn xác nhận. Hồi đáp được gửi qua FormSubmit đến email gia đình; xem bước kích hoạt bên dưới.

## Trải nghiệm Vườn Sương cinematic

Trang chính vẫn là HTML/CSS/JavaScript thuần, không framework, không bước build và không thư viện animation. Chỉ có một mẫu Vườn Sương. Mẫu Sơn Mài tại commit `a07cec6b22b5035d517fe1f99d669506d5be3264` được tham khảo về khung nghi lễ, dấu niêm phong và bố cục hai gia đình; không dùng lại màu sắc hay dữ liệu của mẫu đó.

- Phong bì giấy ivory/sage, botanical SVG, viền champagne, dấu sáp H&T và nền vườn sương.
- Một lần nhấn: dấu sáp rời ra, nắp gập 3D, thiệp trượt lên, phong bì lùi xuống rồi tan vào hero. Chuyển cảnh chính 3 giây; tên hai bạn xuất hiện lần lượt, sau đó đến lời mời và ngày cưới.
- Lịch cưới gồm hai khung giấy hiện lần lượt; hai gia đình trình bày cân đối. Story có ảnh parallax nhẹ khi trình duyệt hỗ trợ scroll-driven animations; trình duyệt khác giữ ảnh tĩnh. Album có hover zoom trên thiết bị có chuột.
- Lightbox có ảnh trước/sau, phím ←/→, đóng bằng ESC/nút đóng/nhấn vùng ngoài, giữ focus trong dialog và trả focus về ảnh đã mở.
- Cảnh cảm ơn có cánh hoa bay một lần. Không phát nhạc. RSVP gửi email thật qua FormSubmit sau khi email nhận được kích hoạt.

Mở bằng chuột, chạm, Enter hoặc Space. Trong chuyển cảnh, nút bị vô hiệu hóa để tránh mở hai lần. Sau chuyển cảnh, lớp phong bì được xóa khỏi DOM, trả focus về tiêu đề và giải phóng cuộn trang mà không tự cuộn. Timer giải phóng chạy độc lập với CSS animation. Nếu JavaScript không chạy, toàn bộ nội dung vẫn hiển thị; khi runtime gặp lỗi, trang cũng mở nội dung. `prefers-reduced-motion` bỏ qua chuyển cảnh và cánh hoa.

Trang dùng ảnh cưới thật ở hai kích thước WebP (699px và 420px), có `srcset`/`sizes` cho ảnh trong nội dung, khai báo kích thước 699×1048 và lazy-load bên dưới màn hình đầu. Không chỉnh khuôn mặt hoặc thay màu ảnh. Các tài nguyên minh họa cũ được giữ để đối chiếu, nhưng không còn dùng trong thiệp. Các lớp trang trí không nhận pointer events; bản đồ và phần tử cha không có transform.

| Ảnh gia đình cung cấp | Vị trí                                    |
| --------------------- | ----------------------------------------- |
| `NM_00004.jpg`        | Hero, chia sẻ mạng xã hội và album        |
| `NM_00059.jpg`        | Câu chuyện và album                       |
| `NM_00107.jpg`        | Nền phong bì, chương chuyển cảnh và album |
| `NM_00158.jpg`        | Cảnh cảm ơn và album                      |
| `NM_01440.jpg`        | Ảnh áo dài đỏ kết album                   |

Trên mobile, tên hai bạn nằm ở phần trên, lời mời ở phần dưới để giữ khuôn mặt rõ ràng. Album giữ tỉ lệ dọc của ảnh; lightbox mở bản đầy đủ. Ghi chú minh họa chỉ còn áp dụng cho lời kể chưa được xác nhận.

## Hồi đáp qua email

Email nhận: `hanthithuytrang1210@gmail.com`. Endpoint công khai nằm trong `assets/rsvp-config.js`; không có mật khẩu hoặc khóa API trong repo. Website vẫn chạy tĩnh, không cần backend riêng.

Form gồm họ tên, xác nhận tham dự/không thể đến/xác nhận sau, chọn một hoặc cả hai ngày, số người, email trả lời và lời nhắn tùy chọn. Khi không tham dự hoặc chưa xác nhận, ngày và số khách không bắt buộc và email ghi 0 người. Khách phải chọn ít nhất một ngày nếu xác nhận đến.

### Kích hoạt email nhận

1. Mở thiệp qua địa chỉ website HTTP/HTTPS, không mở bằng `file://` để gửi thật. Repo có thể phục vụ bằng GitHub Pages từ nhánh `main`, thư mục `/`.
2. Gửi một hồi đáp kiểm thử được ghi rõ là kiểm thử. Lần đầu, FormSubmit gửi thư xác minh tới email nhận.
3. Chủ hộp thư mở thư của FormSubmit và bấm **Activate Form** (kiểm tra cả Spam). Form không được coi là sẵn sàng nhận email trước bước này.
4. Gửi lại một hồi đáp kiểm thử từ chính địa chỉ website sẽ chia sẻ cho khách, rồi kiểm tra email nhận. Có thể cần kích hoạt lại nếu đổi website/email.

Form có trạng thái đang gửi, thành công, lỗi và quá thời gian; không tạo thành công giả bằng cách lưu vào localStorage. Email khách nhập được dùng làm Reply-To; không tự gửi email trả lời khách. Không gửi khi trường honeypot có nội dung. Khi dịch vụ báo chưa kích hoạt hoặc thất bại, form báo đúng lỗi và giữ thông tin để thử lại. Khi timeout, form nói rõ chưa xác nhận được kết quả gửi; yêu cầu trước có thể đã tới dịch vụ nên cần cân nhắc trước khi gửi lại.

Nguồn: [FormSubmit](https://formsubmit.co/) và [hướng dẫn AJAX](https://formsubmit.co/ajax-documentation). Các dữ liệu khách nhập đi qua dịch vụ này đến email gia đình. Dịch vụ có thể lọc spam/giới hạn và việc API nhận yêu cầu không bảo đảm thư đã xuất hiện trong Inbox; phải kiểm chứng bằng thư thật sau kích hoạt.

### Các file chính

| File                                         | Vai trò                                                |
| -------------------------------------------- | ------------------------------------------------------ |
| `index.html`                                 | Nội dung, phong bì, thông tin cưới và dialog RSVP      |
| `assets/invitation-shared.css`               | Typography, palette, reveal, dialog và particles       |
| `assets/garden.css`                          | Phong bì 3D, hero, lịch cưới, gia đình và địa điểm     |
| `assets/storytelling.css`                    | Story, album, lightbox và cảnh cảm ơn                  |
| `assets/invitation.js`                       | Trạng thái mở, recovery, focus và các tương tác        |
| `assets/rsvp.js`, `assets/rsvp-config.js`    | Kiểm tra form, gửi email, xử lý trạng thái và nơi nhận |
| `assets/botanical.svg`, `assets/favicon.svg` | Họa tiết lá/hoa và monogram                            |
| `verify-invitations.mjs`                     | Kiểm thử Chromium và chụp ảnh minh chứng               |

## Kiểm tra giao diện

Cần Node.js 22+ và Chrome/Chromium. Mở **một phiên trình duyệt kiểm thử riêng** với cổng `9333`, không dùng profile duyệt web thường ngày. Ví dụ PowerShell trên Windows:

```powershell
$testProfile = Join-Path (Get-Location) '.story-test-profile'
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--remote-debugging-port=9333',
  "--user-data-dir=$testProfile", '--no-first-run', 'about:blank'
)
node verify-invitations.mjs
```

Script tự tạo và đóng tab kiểm thử riêng, kết nối qua Chrome DevTools Protocol, không cần cài package. Có thể đặt `CHROME_DEBUG_URL` để đổi cổng. Dừng phiên Chrome kiểm thử sau khi dùng; thư mục profile và kết quả tạm được Git bỏ qua.

Kiểm thử gồm 320, 375, 390, 768 và 1440px, thêm landscape 844×390 và màn hình thấp 375×568. Bao gồm mở lần đầu, Enter/Space/touch, chống mở hai lần, thời lượng, focus, cuộn, không tràn ngang, giữ dữ liệu và tọa độ Maps, reveal, ảnh lỗi, lightbox, 5 ảnh thật, RSVP, reload, reduced motion, hủy animation, runtime recovery, thiếu IntersectionObserver và tắt JavaScript. RSVP được chặn request bằng Chrome DevTools Protocol để kiểm tra payload, gửi lặp, loading, success, lỗi, chưa kích hoạt và timeout; **không gửi thư thật trong bộ test**. Lỗi asset/console/runtime của ứng dụng làm kiểm thử thất bại; request bị hủy do chuyển trang không được coi là thiếu asset. Cảnh báo mạng dịch vụ ngoài được ghi riêng.

Ảnh PNG ở `verification/` và báo cáo `verification/report.json` được sinh lại sau mỗi lần chạy thành công. Các ảnh chọn để review nằm trong [docs/screenshots](docs/screenshots/). Kiểm thử trên Chromium không thay cho việc xem lại trên Safari/iOS hoặc điện thoại thật; chưa đo FPS trên thiết bị thật.

## Trước khi công khai

- Gia đình xác nhận giờ đón khách ngày 23/11/2026 và giờ làm lễ ngày 24/11/2026. Hiện trang giữ thông báo sẽ cập nhật, không tự điền giờ.
- Xác nhận lời kể/lời hẹn minh họa hiện có; ảnh thật đã được cung cấp và thay vào thiệp.
- Kích hoạt email FormSubmit và xác minh một thư hồi đáp thật từ website đang chạy. Các kiểm thử giả lập không thay thế bước này.
- Kiểm tra lại địa chỉ hai sự kiện, thông tin âm lịch đang giữ nguyên và điểm ghim nhà chú rể trước khi chia sẻ rộng rãi.

Repo hiện dùng để bàn giao: `https://github.com/MumeiLevina/thiepcuoi`. Thông tin cưới đã xác nhận được giữ nguyên.
