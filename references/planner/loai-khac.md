# Các loại yêu cầu khác

Mục lục: [Tối ưu hiệu năng](#tối-ưu-hiệu-năng) · [Nâng cấp thư viện / framework](#nâng-cấp-thư-viện--framework)
· [Thay đổi dữ liệu / migration](#thay-đổi-dữ-liệu--migration) · [Tích hợp bên thứ ba](#tích-hợp-bên-thứ-ba)
· [Bảo mật](#bảo-mật) · [Hạ tầng / CI / cấu hình](#hạ-tầng--ci--cấu-hình) · [Chỉnh giao diện](#chỉnh-giao-diện)

Chỉ đọc mục liên quan. Yêu cầu nào không khớp mục nào thì áp dụng tinh thần chung: chốt đích
đến đo được, dựng lưới an toàn trước, chia bước nhỏ và mỗi bước đều kiểm được.

## Tối ưu hiệu năng

"Làm cho nhanh hơn" không kiểm được. Nhanh hơn bao nhiêu, đo bằng gì, trên dữ liệu nào?

- **Chốt:** thao tác nào chậm; con số hiện tại; mục tiêu bằng con số (ví dụ P95 dưới
  300 ms); dữ liệu và môi trường dùng để đo. Người dùng thường không có con số hiện tại,
  nên hãy đề xuất cách đo và một mục tiêu hợp lý để họ chọn.
- **Khảo sát:** tìm điểm nghẽn khả nghi (truy vấn N+1, thiếu index, vòng lặp lồng, render
  lại thừa…) và ghi bằng chứng. Nếu chưa đo thì chưa kết luận được.
- **Task:** T1 dựng cách đo (script benchmark hoặc lệnh đo) và ghi lại số liệu gốc. Các task
  sau, mỗi task một thay đổi, kèm con số trước và sau. Không gộp nhiều tối ưu vào một task,
  vì khi đó không biết cái nào có tác dụng.
- **Nghiệm thu:** đạt mục tiêu bằng đúng cách đo đã chốt; test chức năng vẫn xanh.
- **Hỏi thêm nếu có:** đánh đổi như dùng thêm bộ nhớ, thêm cache (dữ liệu có thể cũ trong
  X giây), hay thêm hạ tầng (Redis…) đều là quyết định loại C.

## Nâng cấp thư viện / framework

- **Chốt:** lên bản nào; vì sao (bảo mật, tính năng mới, hết hỗ trợ); nếu gặp thay đổi phá
  vỡ lớn thì có chấp nhận sửa nhiều chỗ không, hay dừng ở một bản trung gian.
- **Khảo sát:** đọc changelog / hướng dẫn migration giữa bản hiện tại và bản đích (nếu có
  công cụ tra cứu web thì dùng). Grep mọi chỗ dùng các API bị đổi hoặc bị bỏ và liệt kê ra.
  Kiểm các thư viện phụ thuộc có tương thích với bản mới không.
- **Task:** nhảy qua từng bản chính một (major by major) nếu cách nhau nhiều bản. Mỗi bước
  gồm: nâng phiên bản, sửa các chỗ bị phá vỡ theo danh sách, build và test xanh. Chạy codemod
  chính thức nếu có.
- **Nghiệm thu:** build, test, lint xanh; ứng dụng chạy lên được; các luồng chính (liệt kê
  cụ thể) hoạt động như trước.
- **Rủi ro:** ghi cách quay lui (khôi phục lockfile).

## Thay đổi dữ liệu / migration

Dữ liệu hỏng thì khó cứu, nên đây là vùng đáng hỏi kỹ nhất.

- **Chốt:** dữ liệu cũ biến đổi thế nào; có được mất dữ liệu nào không; có được dừng hệ thống
  trong lúc migrate không; dữ liệu lớn cỡ nào; cách quay lui nếu hỏng.
- **Khảo sát:** công cụ migration dự án đang dùng, migration gần nhất làm mẫu, mọi chỗ đọc và
  ghi vào bảng hoặc trường bị đổi.
- **Task:** migration có chiều đi và chiều về (up/down). Với hệ thống không được dừng, chia
  thành các bước tương thích hai chiều: thêm trường mới → ghi cả hai nơi → chép dữ liệu cũ
  sang → chuyển sang đọc nơi mới → bỏ trường cũ. Mỗi bước deploy riêng được.
- **Nghiệm thu:** chạy đi rồi chạy về trên bản sao dữ liệu thật hoặc dữ liệu mẫu đủ lớn; đếm
  số bản ghi trước và sau; kiểm vài bản ghi mẫu cụ thể.
- **Ghi chú cho Review:** không có thao tác xoá dữ liệu nào nằm ngoài kế hoạch.

## Tích hợp bên thứ ba

- **Chốt:** dịch vụ nào, dùng những chức năng nào của nó; đã có tài khoản, API key, môi trường
  sandbox chưa (chưa có thì người dùng phải tạo, planner không tạo); giới hạn gọi (rate
  limit) và chi phí; khi dịch vụ lỗi hoặc chậm thì hệ thống xử lý ra sao (thử lại, báo lỗi,
  xếp hàng chờ).
- **Khảo sát:** dự án đã tích hợp dịch vụ ngoài nào chưa (dùng làm khuôn: client đặt ở đâu,
  cấu hình key thế nào, mock trong test thế nào).
- **Thiết kế:** interface của lớp bọc (client/adapter) để phần còn lại của hệ thống không phụ
  thuộc trực tiếp vào SDK bên ngoài; biến môi trường cần có. Key không bao giờ được ghi thẳng
  vào code.
- **Task:** lớp bọc kèm test dùng mock → luồng nghiệp vụ dùng lớp bọc → xử lý lỗi, thử lại,
  webhook (nếu có) → cấu hình.
- **Nghiệm thu:** chạy được với sandbox; các trường hợp dịch vụ trả lỗi, hết thời gian chờ,
  và webhook trùng lặp (nếu có) đều được xử lý đúng như đã chốt.

## Bảo mật

- **Chốt:** mối đe doạ cụ thể là gì (ai tấn công, vào đâu); mức độ nghiêm trọng; có cần xử
  lý dữ liệu hoặc phiên đăng nhập đã bị lộ không (thu hồi token, bắt đổi mật khẩu).
- **Khảo sát:** mọi điểm vào có cùng lỗ hổng (Grep theo mẫu), cơ chế bảo mật dự án đang có
  sẵn (validate, escape, kiểm quyền).
- **Task:** test chứng minh lỗ hổng tồn tại → vá ở tầng dùng chung nếu được, thay vì vá từng
  chỗ → các chỗ còn lại.
- **Nghiệm thu:** test tấn công bị chặn; người dùng hợp lệ không bị ảnh hưởng.
- **Ghi chú cho Review:** soi kỹ mọi điểm vào đã liệt kê; không log dữ liệu nhạy cảm.

## Hạ tầng / CI / cấu hình

- **Chốt:** môi trường nào (dev, staging, production); nền tảng (GitHub Actions, GitLab CI,
  Docker, Vercel…); ai giữ secret và secret đặt ở đâu; điều kiện chạy (mỗi push, mỗi PR,
  theo lịch).
- **Khảo sát:** cấu hình hiện có, các lệnh build/test thật của dự án.
- **Task:** mỗi task một phần chạy được và kiểm được riêng (ví dụ job lint, rồi job test,
  rồi job deploy).
- **Nghiệm thu:** pipeline chạy xanh trên một nhánh thử; pipeline báo đỏ đúng khi cố tình làm
  hỏng test.
- **Lưu ý:** secret là việc người dùng tự thêm vào nền tảng. Kế hoạch chỉ ghi tên biến và ý
  nghĩa của nó.

## Chỉnh giao diện

- **Chốt:** có bản thiết kế hay ảnh tham chiếu không; màn hình và kích thước màn hình nào
  (điện thoại, máy tính bảng, máy tính); có chế độ tối không; có yêu cầu về khả năng truy cập
  không.
- **Khảo sát:** hệ thống component và token màu/khoảng cách đang có. Ưu tiên dùng lại, không
  tạo style mới khi đã có sẵn.
- **Nghiệm thu:** mô tả cụ thể thứ nhìn thấy được ở từng kích thước màn hình, cùng các trạng
  thái (hover, focus, disabled, rỗng, lỗi, đang tải). "Đẹp hơn" không phải là tiêu chí.
