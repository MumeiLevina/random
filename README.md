# Thiệp cưới Vườn Sương

Thiệp cưới của Quốc Hảo và Thùy Trang. Trang chạy trực tiếp từ `index.html` và không cần cài thư viện hay chạy lệnh build. Đường dẫn cũ `invitations/01-vuon-suong.html` chuyển về trang chính.

## Nhà chú rể

Mục **Nhà chú rể** trong `index.html` hiển thị bản đồ và nút **Chỉ đường trên Google Maps**. Khi đổi địa điểm, cập nhật cùng một cặp tọa độ cho tham số `q` của bản đồ nhúng và `destination` của nút chỉ đường.

## Nội dung cần cập nhật

Điền giờ đón khách và giờ làm lễ ở hai mục tương ứng trong lịch cưới khi gia đình xác nhận. Ảnh trong `assets/images/` và nội dung câu chuyện đang là minh họa. Form hồi đáp hiện chạy ở chế độ xem thử trên trình duyệt.

## Trải nghiệm Vườn Sương cinematic

Trang chính vẫn là HTML/CSS/JavaScript thuần, không framework, không bước build và không thư viện animation. Chỉ có một mẫu Vườn Sương. Mẫu Sơn Mài tại commit `a07cec6b22b5035d517fe1f99d669506d5be3264` được tham khảo về khung nghi lễ, dấu niêm phong và bố cục hai gia đình; không dùng lại màu sắc hay dữ liệu của mẫu đó.

- Phong bì giấy ivory/sage, botanical SVG, viền champagne, dấu sáp H&T và nền vườn sương.
- Một lần nhấn: dấu sáp rời ra, nắp gập 3D, thiệp trượt lên, phong bì lùi xuống rồi tan vào hero. Chuyển cảnh chính 3 giây; tên hai bạn xuất hiện lần lượt, sau đó đến lời mời và ngày cưới.
- Lịch cưới gồm hai khung giấy hiện lần lượt; hai gia đình trình bày cân đối. Story có ảnh parallax nhẹ khi trình duyệt hỗ trợ scroll-driven animations; trình duyệt khác giữ ảnh tĩnh. Album có hover zoom trên thiết bị có chuột.
- Lightbox có ảnh trước/sau, phím ←/→, đóng bằng ESC/nút đóng/nhấn vùng ngoài, giữ focus trong dialog và trả focus về ảnh đã mở.
- Cảnh cảm ơn có cánh hoa bay một lần. Không phát nhạc. RSVP chỉ xem thử, không gửi hay lưu dữ liệu khách.

Mở bằng chuột, chạm, Enter hoặc Space. Trong chuyển cảnh, nút bị vô hiệu hóa để tránh mở hai lần. Sau chuyển cảnh, lớp phong bì được xóa khỏi DOM, trả focus về tiêu đề và giải phóng cuộn trang mà không tự cuộn. Timer giải phóng chạy độc lập với CSS animation. Nếu JavaScript không chạy, toàn bộ nội dung vẫn hiển thị; khi runtime gặp lỗi, trang cũng mở nội dung. `prefers-reduced-motion` bỏ qua chuyển cảnh và cánh hoa.

Ảnh PNG gốc được giữ nguyên để gia đình có thể thay hoặc đối chiếu. Trang sử dụng bản WebP cùng kích thước: tổng khoảng 453 KB thay cho 6,88 MB PNG (giảm khoảng 93%). Ảnh dưới màn hình đầu được lazy-load và có kích thước khai báo. Các lớp trang trí không nhận pointer events; bản đồ và phần tử cha không có transform.

### Các file chính

| File                                         | Vai trò                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `index.html`                                 | Nội dung, phong bì, thông tin cưới và dialog RSVP  |
| `assets/invitation-shared.css`               | Typography, palette, reveal, dialog và particles   |
| `assets/garden.css`                          | Phong bì 3D, hero, lịch cưới, gia đình và địa điểm |
| `assets/storytelling.css`                    | Story, album, lightbox và cảnh cảm ơn              |
| `assets/invitation.js`                       | Trạng thái mở, recovery, focus và các tương tác    |
| `assets/botanical.svg`, `assets/favicon.svg` | Họa tiết lá/hoa và monogram                        |
| `verify-invitations.mjs`                     | Kiểm thử Chromium và chụp ảnh minh chứng           |

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

Kiểm thử gồm 320, 375, 390, 768 và 1440px, thêm landscape 844×390 và màn hình thấp 375×568. Bao gồm mở lần đầu, Enter/Space/touch, chống mở hai lần, thời lượng, focus, cuộn, không tràn ngang, giữ dữ liệu và tọa độ Maps, reveal, ảnh lỗi, lightbox, RSVP demo, reload, reduced motion, hủy animation, runtime recovery, thiếu IntersectionObserver và tắt JavaScript. Lỗi asset/console/runtime của ứng dụng làm kiểm thử thất bại; cảnh báo mạng dịch vụ ngoài được ghi riêng để không nhầm với lỗi source.

Ảnh PNG ở `verification/` và báo cáo `verification/report.json` được sinh lại sau mỗi lần chạy thành công. Các ảnh chọn để review nằm trong [docs/screenshots](docs/screenshots/). Kiểm thử trên Chromium không thay cho việc xem lại trên Safari/iOS hoặc điện thoại thật; chưa đo FPS trên thiết bị thật.

## Trước khi công khai

- Gia đình xác nhận giờ đón khách ngày 23/11/2026 và giờ làm lễ ngày 24/11/2026. Hiện trang giữ thông báo sẽ cập nhật, không tự điền giờ.
- Cung cấp ảnh cưới thật và xác nhận lời kể/lời hẹn minh họa hiện có.
- Cung cấp nơi nhận và phương thức lưu hồi đáp nếu muốn bật RSVP thật; hiện form luôn thông báo chưa gửi.
- Kiểm tra lại địa chỉ hai sự kiện, thông tin âm lịch đang giữ nguyên và điểm ghim nhà chú rể trước khi chia sẻ rộng rãi.

Thay đổi được review qua pull request; không tự merge hoặc xuất bản bản nâng cấp.
