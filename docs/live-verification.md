# Kiểm tra website và email thực tế

Website: https://mumeilevina.github.io/thiepcuoi/

Ngày kiểm tra: 08/11/2026.

- Trang chính và đủ 5 ảnh cưới thật trả HTTP 200; HTML có script gửi hồi đáp thật.
- Đã gửi một yêu cầu kỹ thuật ghi rõ **không phải khách tham dự**, 0 người, từ website qua chính form. Không dùng kết quả giả lập cho bước này.
- FormSubmit trả HTTP 200 với `success: "false"` và thông báo **This form needs Activation**. Dịch vụ xác nhận đã gửi email có liên kết **Activate Form** tới địa chỉ nhận đã cấu hình.
- Giao diện hiển thị đúng trạng thái chờ kích hoạt, không báo đã gửi thành công.
- Chủ hộp thư `hanthithuytrang1210@gmail.com` cần bấm liên kết kích hoạt trong Inbox hoặc Spam, sau đó gửi lại một hồi đáp kiểm thử. Chưa xác minh được email hồi đáp đã tới Inbox.

## Lỗi cuộn khi mở thiệp

Đã tái hiện trên bản công khai trước sửa:

- Mở đường dẫn có `#album-title`: vị trí cuộn sau mở khoảng 8373px trên viewport 390×844.
- Cuộn cuối trang rồi reload: trình duyệt khôi phục khoảng 11406px phía sau phong bì và giữ nguyên sau mở.

Nguyên nhân đã quan sát: điều hướng fragment và khôi phục scroll của trình duyệt vẫn chạy khi lớp phong bì chỉ khóa `overflow` của body.

Bản sửa tạm cố định body tại đầu trang, tắt khôi phục scroll trong lúc phong bì đóng, hoãn fragment đến sau khi hoàn tất tải/mở và trả lại điều hướng mặc định. Không giữ một vòng lặp ép scroll sau khi khách đã mở thiệp. Các nhánh reload từ cuối, fragment ban đầu, history back và ảnh tải chậm nằm trong `verify-invitations.mjs`.
