# Refactor / dọn code

Cam kết cốt lõi của refactor: hành vi bên ngoài không đổi. Mọi thứ trong kế hoạch đều phục vụ
việc giữ cam kết đó và chứng minh được là đã giữ.

## Cần chốt với người dùng

- **Vì sao refactor:** khó đọc, trùng lặp, chuẩn bị cho tính năng X, hay hiệu năng? Lý do
  quyết định đích đến và mức nào thì dừng. Refactor không có lý do cụ thể thường phình mãi
  không dứt.
- **Đích đến:** sau refactor, cấu trúc trông thế nào (có những module nào, mỗi module chịu
  trách nhiệm gì). Planner đề xuất, người dùng duyệt.
- **Ranh giới được đổi:** có được đổi API nội bộ không (tức là sửa luôn các chỗ gọi trong
  repo)? API công khai và định dạng dữ liệu mặc định là không được đổi.
- **Lỗi phát hiện ra trong lúc refactor:** mặc định là không sửa trong đợt này, chỉ ghi lại.
  Trộn sửa lỗi vào refactor thì không còn chứng minh được "hành vi không đổi". Nếu người
  dùng muốn sửa luôn thì tách thành task riêng, có nghiệm thu riêng.

## Khảo sát

- **Lưới an toàn:** test hiện có phủ vùng này tới đâu? Chỉ ra cụ thể các file test.
- **Mọi chỗ gọi** tới code sắp đổi (dùng Grep), liệt kê trong kế hoạch để coder không sót.
- **Những gì phải giữ nguyên:** API công khai, route, định dạng file/dữ liệu, thông báo lỗi
  người dùng nhìn thấy, cấu hình. Liệt kê vào "Ghi chú cho Review → Không được thay đổi".

## Khung task điển hình

1. (Nếu test còn mỏng) **Viết test đặc tả hành vi hiện tại** (characterization test) cho
   vùng sắp đổi. Xong khi: các test này chạy xanh trên code cũ.
2. Trở đi: **từng bước nhỏ**, ví dụ tách một module, đổi tên, gom trùng lặp. Mỗi bước xong
   thì build và test đều xanh. Không sửa kỳ vọng của test cũ; chỉ được sửa import hoặc
   đường dẫn.
3. Cuối: **xoá code chết** còn sót lại.

Thứ tự các bước sao cho có thể dừng ở bất kỳ bước nào mà code vẫn chạy đúng.

## Nghiệm thu nên có

- Toàn bộ test cũ và test đặc tả đều xanh mà không sửa kỳ vọng.
- Lint, typecheck, build đều xanh.
- API công khai (nếu có) giống hệt trước.
- Đích đến đã đạt, kiểm được bằng cấu trúc file hoặc bằng việc không còn trùng lặp X.

## Ghi chú cho Review

Diff không chứa thay đổi hành vi. Test nào bị sửa đều phải có lý do và lý do đó phải khớp với
kế hoạch.
