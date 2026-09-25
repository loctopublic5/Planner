# Bảng kiểm điểm chưa chốt

Dùng ở Bước 3 để không bỏ sót. Chỉ đi qua những chiều liên quan tới loại yêu cầu. Với mỗi
chiều, tự hỏi: codebase đã trả lời chưa (loại A)? Có mặc định an toàn không (loại B)? Hay chỉ
người dùng mới quyết được (loại C)? Chỉ loại C mới trở thành câu hỏi.

Cột "Ví dụ câu hỏi" viết bằng ngôn ngữ của người dùng, không phải thuật ngữ kỹ thuật.

| # | Chiều | Cần làm rõ | Ví dụ câu hỏi |
|---|---|---|---|
| 1 | Mục tiêu | Vấn đề thật đằng sau yêu cầu; thế nào là thành công | "Nút này để kế toán đối soát cuối tháng, hay để gửi cho khách?" (câu trả lời quyết định cột nào cần có) |
| 2 | Người dùng & quyền | Ai dùng; ai **không** được dùng; vai trò | "Nhân viên thường có được xem đơn của người khác không?" |
| 3 | Phạm vi | Cái gì trong, cái gì ngoài; bản tối thiểu là gì | "Đợt này chỉ cần tạo và xem, hay cần cả sửa và xoá?" |
| 4 | Hành vi chính | Luồng từng bước; đầu vào và đầu ra | "Sau khi lưu thì quay về danh sách hay ở lại trang chi tiết?" |
| 5 | Dữ liệu | Lưu gì, ở đâu, giữ bao lâu; dữ liệu cũ xử lý ra sao | "Các khách hàng đã có sẵn chưa có số điện thoại thì để trống hay bắt nhập bổ sung?" |
| 6 | Giao diện | Có thiết kế sẵn không; màn hình nào; điện thoại hay máy tính; ngôn ngữ | "Có bản thiết kế không, hay dựng theo kiểu các màn hình hiện có?" |
| 7 | Lỗi & biên | Nhập sai, rỗng, trùng, quá lớn, mất mạng, hai người sửa cùng lúc | "Nếu hai người cùng sửa một đơn thì người lưu sau ghi đè, hay báo xung đột?" |
| 8 | Phi chức năng | Tốc độ, số lượng, bảo mật, lưu vết, khả năng truy cập | "Một lần nhập khoảng bao nhiêu dòng — vài trăm hay vài trăm nghìn?" |
| 9 | Tích hợp | Dịch vụ ngoài, tài khoản/key, môi trường thử | "Đã có tài khoản sandbox của cổng thanh toán chưa?" |
| 10 | Tương thích | API/định dạng đang có người khác dùng; bản app cũ; dữ liệu cũ | "Ứng dụng di động bản cũ có còn gọi API này không?" |
| 11 | Triển khai | Môi trường, biến cấu hình, bật dần, cách quay lui | "Có cần bật thử cho một nhóm người dùng trước không?" |
| 12 | Nghiệm thu | Người dùng sẽ kiểm thế nào để nói "xong" | "Bạn sẽ thử bằng dữ liệu thật nào để xác nhận?" |
| 13 | Ràng buộc | Hạn chót, không được thêm thư viện, ngân sách, công nghệ bắt buộc | "Có ràng buộc nào về thư viện hay dịch vụ trả phí không?" |

## Câu hỏi tốt và câu hỏi tồi

| Tồi | Vì sao | Tốt |
|---|---|---|
| "Bạn muốn tính năng này thế nào?" | Mở, đẩy việc suy nghĩ lại cho người dùng | "Xuất những đơn nào? (A, đề xuất) theo bộ lọc hiện tại · (B) chỉ trang đang xem · (C) tất cả" |
| "Dùng soft delete hay hard delete?" | Thuật ngữ, không nói hệ quả | "Xoá xong có cần khôi phục lại được không? (A) Có, trong 30 ngày · (B) Không, xoá hẳn" |
| "Dự án dùng framework gì?" | Codebase đã trả lời được | (Không hỏi — tự đọc `package.json`) |
| "Có cần validate email không, có cần trim không, có cần lowercase không?" | Chi tiết loại B, lại tách vụn | (Tự quyết theo cách dự án đang validate, ghi file mẫu) |
| "Làm A hay B?" | Không nói hệ quả, không đề xuất | "A (đề xuất): nhanh, dùng lại được X nhưng chưa hỗ trợ Y · B: hỗ trợ Y nhưng phải thêm thư viện Z" |

## Khi người dùng không rành kỹ thuật

Chuyển mọi lựa chọn kỹ thuật thành hệ quả họ cảm nhận được: nhanh hay chậm, tốn tiền hay
không, làm mất bao lâu, người dùng cuối thấy gì khác. Nếu thực sự không có khác biệt nào họ
cảm nhận được thì lựa chọn đó là loại B: tự quyết, đừng hỏi.
