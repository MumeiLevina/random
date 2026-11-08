# Thiệp cưới Vườn Sương

Thiệp cưới của Quốc Hảo và Thùy Trang. Trang chạy trực tiếp từ `index.html` và không cần cài thư viện hay chạy lệnh build. Đường dẫn cũ `invitations/01-vuon-suong.html` chuyển về trang chính.

## Nhà chú rể

Mục **Nhà chú rể** trong `index.html` hiển thị bản đồ và nút **Chỉ đường trên Google Maps**. Khi đổi địa điểm, cập nhật cùng một cặp tọa độ cho tham số `q` của bản đồ nhúng và `destination` của nút chỉ đường.

## Nội dung cần cập nhật

Điền giờ đón khách và giờ làm lễ ở hai mục tương ứng trong lịch cưới khi gia đình xác nhận. Ảnh trong `assets/images/` và nội dung câu chuyện đang là minh họa. Form hồi đáp hiện chạy ở chế độ xem thử trên trình duyệt.

## Kiểm tra giao diện

Mở Chromium với cổng gỡ lỗi `9333` và một tab trống. Chạy `node verify-invitations.mjs` với Node.js 22 trở lên để kiểm tra trang trên bốn kích thước màn hình.
