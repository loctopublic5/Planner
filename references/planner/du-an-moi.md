# Dự án mới từ đầu

Không có codebase để copy quy ước, nên planner phải đặt quy ước, và mọi thứ coder cần đều
phải được viết ra tường minh. Đây là loại kế hoạch dễ bị hở nhất, vì coder sẽ tự lấp mọi
khoảng trống bằng thói quen riêng.

## Phải chốt với người dùng (nếu họ chưa nói)

- **Mục đích và người dùng:** ai dùng, dùng để làm gì, dùng trên thiết bị nào.
- **Loại sản phẩm:** web, ứng dụng di động, desktop, CLI, API, script, extension…
- **Bản tối thiểu (MVP):** 3–7 chức năng cốt lõi cho giai đoạn 1, và những gì để sau. Đề
  xuất sẵn một danh sách để người dùng gạch bớt hoặc thêm, đừng bắt họ tự liệt kê.
- **Stack:** ngôn ngữ, framework, cơ sở dữ liệu, cách đăng nhập. Hỏi người dùng (hoặc đội
  của họ) đã quen stack nào, rồi đề xuất dựa trên: mức quen thuộc, yêu cầu thực tế
  (realtime, SEO, offline, số người dùng), và độ phổ biến, độ ổn định của công nghệ. Quen
  thuộc thường quan trọng hơn "tốt nhất trên lý thuyết".
- **Nơi chạy và deploy:** máy cá nhân, VPS, dịch vụ cloud nào; ngân sách hosting.
- **Dữ liệu:** các thực thể chính và quan hệ giữa chúng; có dữ liệu sẵn cần nhập vào không.
- **Ràng buộc:** ngôn ngữ giao diện, phải chạy offline, hạn chót, dịch vụ trả phí.
- **Vị trí thư mục dự án** nếu chưa rõ.

## Tự quyết (ghi vào kế hoạch; nêu trong bản chốt để người dùng thấy)

- Công cụ lint/format, test framework phổ biến nhất của stack.
- Cấu trúc thư mục theo chuẩn của framework.
- Quy ước đặt tên theo chuẩn cộng đồng của ngôn ngữ.
- Phiên bản: ghi phiên bản chính (major) của runtime và framework. Nếu không chắc bản ổn định
  hiện hành là bản nào, ghi "bản LTS/ổn định hiện hành" và yêu cầu coder khoá phiên bản
  bằng lockfile, ghi lại trong README.

## Kế hoạch dự án mới cần thêm

- **Cây thư mục dự kiến** trong mục Thiết kế, đến mức thư mục và các file chính.
- **Quy ước viết tường minh** trong Bối cảnh kỹ thuật, vì chưa có file mẫu: đặt tên, cách
  chia module, cách xử lý lỗi, cách đọc cấu hình (biến môi trường), cách viết test. Ghi
  thêm: "sau T1, các file do T1 tạo là file mẫu cho các task sau".
- **Biến môi trường** cần có, ghi vào `.env.example`, kèm ý nghĩa của từng biến.
- **Lệnh kiểm tra** do chính T1 tạo ra; ghi trước tên lệnh dự kiến (ví dụ `npm test`).

## Khung task điển hình

1. **Khởi tạo khung:** init dự án, cài dependency, lint/format, test runner với một test mẫu
   chạy được, script chạy dev, README hướng dẫn chạy. Xong khi: lệnh dev chạy lên được, lệnh
   test xanh, lệnh lint sạch.
2. **Mô hình dữ liệu và lưu trữ.**
3. Trở đi: **mỗi chức năng MVP một lát dọc** (dữ liệu → logic → giao diện), để mỗi chức năng
   xong là dùng được ngay.
4. Cuối: **cấu hình deploy**, nếu nằm trong phạm vi.

Ứng dụng có từ 4–5 chức năng trở lên gần như luôn là quy mô Lớn: chia giai đoạn, giai đoạn 1
gồm khung và 1–3 chức năng quan trọng nhất.

## Nghiệm thu nên có

- Máy sạch: làm theo README từ đầu là chạy được.
- Mỗi chức năng MVP, nhìn từ góc người dùng cuối.
- Lệnh test, lint, build đều xanh.
