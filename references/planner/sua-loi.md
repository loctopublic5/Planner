# Sửa lỗi

Kế hoạch sửa lỗi có hai mục đích: sửa đúng nguyên nhân gốc chứ không che triệu chứng, và
chứng minh được là đã sửa. Kế hoạch dựa trên phỏng đoán về nguyên nhân là kế hoạch nguy
hiểm nhất: coder sẽ sửa đúng chỗ bạn chỉ, dù chỗ đó không phải chỗ hỏng.

## Thông tin cần có (thiếu thì hỏi)

- **Hiện tượng:** thấy gì, và lẽ ra phải thấy gì.
- **Cách tái hiện:** các bước, dữ liệu, tài khoản, môi trường (trình duyệt, hệ điều hành,
  phiên bản, production hay dev).
- **Bằng chứng:** thông báo lỗi, log, stack trace, ảnh chụp màn hình.
- **Thời điểm:** xuất hiện từ khi nào, trước đó có chạy đúng không (nếu có thì là hồi quy).
- **Mức độ:** ảnh hưởng bao nhiêu người, có làm hỏng dữ liệu không. Nếu dữ liệu đã hỏng thì
  có cần sửa lại dữ liệu cũ không; đây là quyết định của người dùng.

## Điều tra (chỉ đọc)

- Lần theo luồng từ điểm tái hiện tới chỗ sai. Có thể chạy test sẵn có, `git log` và
  `git blame` cho các file liên quan (với lỗi hồi quy, commit gây lỗi thường lộ ra ở đây).
  Không sửa file nào.
- Kết luận nguyên nhân gốc kèm bằng chứng: dòng code nào, trong điều kiện nào thì sai.
- Tìm những chỗ khác có cùng mẫu lỗi. Liệt kê ra, rồi hỏi người dùng có sửa luôn trong đợt
  này không; đó là câu hỏi về phạm vi.

## Khi chưa chắc nguyên nhân

Đừng viết kế hoạch sửa dựa trên đoán. Có hai cách:

1. **Hỏi thêm người dùng** những thông tin còn thiếu (log, dữ liệu, bước tái hiện). Ưu tiên
   cách này.
2. **Mở đầu bằng task chẩn đoán**, khi đọc code không đủ để kết luận: coder viết test hoặc
   thêm log tạm để tái hiện và xác nhận giả thuyết. Ghi các giả thuyết theo thứ tự khả năng
   và cách phân biệt giữa chúng. Task này "xong khi" giả thuyết được xác nhận hoặc bị bác
   bỏ. Nếu bị bác bỏ, coder dừng lại và báo về, không tự sửa theo hướng khác. Khi đó quay
   lại chặng lập kế hoạch.

## Khung task điển hình

1. **Viết test tái hiện lỗi.** Xong khi: test thất bại, và thất bại đúng vì lỗi đang sửa
   (không phải vì lỗi setup).
2. **Sửa nguyên nhân gốc** tại `<file>` (`<hàm/vùng>`). Xong khi: test ở T1 pass, toàn bộ
   test cũ vẫn pass.
3. (Nếu người dùng đồng ý) Sửa các chỗ có cùng mẫu lỗi, hoặc sửa dữ liệu đã hỏng.

Nếu dự án không có hạ tầng test, T1 là mô tả kịch bản kiểm tra thủ công chính xác từng bước.
Việc có dựng hạ tầng test hay không là một câu hỏi phạm vi cho người dùng.

## Nghiệm thu nên có

- Kịch bản tái hiện ban đầu nay cho kết quả đúng.
- Các luồng lân cận không bị ảnh hưởng. Liệt kê cụ thể luồng nào, đừng ghi "không hồi quy"
  chung chung.

## Ghi chú cho Review

Bản sửa chỉ đụng tới nguyên nhân gốc, không kèm refactor hay "tiện tay dọn". Mọi thay đổi
ngoài vùng lỗi đều phải có trong kế hoạch.
