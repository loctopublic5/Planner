# Tính năng mới / mở rộng tính năng

Tính năng mới hiếm khi thật sự mới: dự án thường đã có một tính năng tương tự để làm khuôn.
Tìm được khuôn là coder chỉ cần làm theo, và reviewer có chuẩn để so.

## Khảo sát

- **Khuôn:** tính năng tương tự nhất đã có. Liệt kê các file của nó theo tầng (route,
  controller/handler, service, model, UI, test). Tính năng mới thường cần đúng bộ file tương
  ứng ở đúng các thư mục đó.
- **Điểm vào:** người dùng chạm tới tính năng từ đâu (menu, route, lệnh CLI, sự kiện, cron)?
- **Dữ liệu:** có cần trường hoặc bảng mới không? Dự án tạo migration theo cách nào (công cụ
  gì, đặt file ở đâu, đặt tên thế nào)?
- **Quyền:** dự án kiểm quyền ở đâu và theo cách nào (middleware, decorator, guard)?
- **Chỗ phải đăng ký:** router, DI container, menu, file i18n, file cấu hình, danh sách
  export. Đây là những thứ coder hay quên nhất, nên phải ghi rõ vào task.

## Thường phải hỏi

- Ai dùng, và ai không được dùng.
- Luồng chính từng bước. Nếu có giao diện: trạng thái rỗng, đang tải, lỗi hiển thị thế nào.
- Giới hạn: số lượng, kích thước, tần suất.
- Dữ liệu cũ khi thêm trường mới: để trống, giá trị mặc định, hay bắt buộc bổ sung.
- Có bản thiết kế giao diện không. Nếu không, đề xuất dựng từ các component đang có.
- Có cần bật dần (feature flag) không. Chỉ hỏi khi dự án đã có cơ chế flag; chưa có thì
  thêm flag là việc ngoài phạm vi.

## Khung task điển hình

1. Dữ liệu: schema/migration, kiểu dữ liệu.
2. Logic nghiệp vụ, kèm unit test.
3. Giao tiếp: API/CLI/handler, kèm test tích hợp nếu dự án có viết loại test này.
4. Giao diện.
5. Nối dây: đăng ký route, menu, quyền, i18n.

Tính năng nhỏ có thể gộp lại thành 1–2 task. Tính năng lớn thì chia theo lát dọc: mỗi lát
làm đủ các tầng cho một hành vi (ví dụ "tạo" trước, "sửa" sau), để mỗi lát xong là dùng được.

## Nghiệm thu nên có

- Luồng chính, với mỗi vai trò được phép.
- Vai trò không được phép: bị chặn và thấy thông báo gì.
- Đầu vào sai: thiếu, sai định dạng, trùng, vượt giới hạn.
- Dữ liệu rỗng.
- Dữ liệu cũ vẫn hiển thị và hoạt động đúng sau khi thêm tính năng.
