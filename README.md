# bangiao — đội agent Lập kế hoạch → Code → Review → Test

Plugin Claude Code cho dây chuyền phát triển phần mềm bốn chặng. Các chặng bàn giao cho
nhau qua thư mục `.bangiao/` trong dự án. Mỗi agent dùng được riêng lẻ, và sẽ được nối thành
một quy trình bởi agent `ship`.

| Chặng | Thành phần | Trạng thái |
|---|---|---|
| Lập kế hoạch | `bangiao:planner` + lệnh `/bangiao:lap-ke-hoach` | ✅ 0.1.0 |
| Code | `bangiao:coder` + lệnh `/bangiao:code` | ✅ 0.2.0 |
| Review | `bangiao:reviewer` | dự kiến |
| Test | `bangiao:tester` | dự kiến |
| Điều phối | `bangiao:ship` | dự kiến |

## Planner làm gì

Bạn đưa một yêu cầu, dù chỉ một câu ("thêm đăng nhập Google", "trang đơn hàng load chậm",
"làm app quản lý chi tiêu"). Planner làm việc như một trưởng dự án:

1. **Khảo sát codebase trước khi hỏi:** tìm tính năng tương tự để làm khuôn, chọn file mẫu
   cho từng quy ước, lấy lệnh test/lint/build thật, xác minh mọi đường dẫn.
2. **Chỉ hỏi những gì bạn mới quyết được:** nghiệp vụ, phạm vi, lựa chọn tốn kém hay khó
   đảo ngược. Mỗi đợt tối đa 4 câu, có phương án đề xuất kèm hệ quả. Những gì code đã trả
   lời thì không hỏi; chi tiết kỹ thuật nhỏ thì planner tự quyết.
3. **Xin duyệt bản chốt phạm vi** với việc cỡ vừa và lớn.
4. **Viết `.bangiao/ke-hoach.md`:** task có thứ tự, mỗi task có "Xong khi" kiểm được; tiêu
   chí nghiệm thu cho chặng Test; ghi chú cho chặng Review; việc lớn thì chia giai đoạn.

Planner xử lý được: tính năng mới, dự án từ đầu, sửa lỗi, refactor, tối ưu hiệu năng, nâng
cấp thư viện, migration dữ liệu, tích hợp bên thứ ba, bảo mật, CI/hạ tầng, chỉnh giao diện.

Planner không viết code. Một hook chặn cứng việc nó ghi file khác `.bangiao/ke-hoach.md`,
hoặc chạy lệnh làm thay đổi file, dependency, git hay database.

## Coder làm gì

Coder là kỹ sư triển khai (Sonnet, effort high) làm đúng theo `.bangiao/ke-hoach.md`:

1. **Kiểm tra được phép code chưa:** kế hoạch còn câu hỏi bỏ ngỏ thì dừng, không tự đoán.
2. **Tiền kiểm kế hoạch với codebase thật** trước khi sửa dòng đầu tiên: đường dẫn, chữ ký,
   file mẫu, lệnh kiểm tra, phiên bản thư viện thật đang cài.
3. **Làm từng task theo thứ tự,** viết test đi kèm, kiểm "Xong khi" bằng lệnh thật. Không
   làm ngoài phạm vi, không "làm cho xanh" bằng cách skip test hay nới assert.
4. **Ghi `.bangiao/thay-doi.md`** cho Review và Test: đã làm gì, khác kế hoạch chỗ nào, kết
   quả kiểm tra, chỗ nên soi kỹ.
5. **Ghi sổ tay** những bài học gỡ lỗi khó, dùng lại được ở dự án khác.

Kế hoạch sai thì coder dừng lại và báo, không tự làm khác đi. Lệnh `/bangiao:code` khi đó tự
chuyển sang planner để hỏi bạn và sửa kế hoạch, rồi cho coder làm tiếp.

Hook chặn coder chạy lệnh phá hủy hoặc không đảo ngược được: `rm -r` ngoài thư mục build,
`git reset --hard`/`clean`/`checkout -- .`/`push --force`, xoá nhánh, drop database,
migration production, deploy, publish, và việc sửa kế hoạch. Cài gói, sửa code, chạy test
vẫn bình thường.

## Cài đặt

Trong Claude Code:

```
/plugin marketplace add loctopublic5/Planner
/plugin install bangiao@bangiao
```

Cập nhật về sau: `/plugin marketplace update bangiao`.

Hook chặn cần có Node.js trong PATH. Máy không có Node thì hook báo lỗi nhưng không chặn gì,
và các agent vẫn chạy theo luật trong prompt.

Nếu trước đây bạn đã cài riêng lẻ skill `planner-agent`, `lap-ke-hoach-trien-khai`,
`coder-agent` hoặc subagent `~/.claude/agents/coder-agent.md`, hãy gỡ chúng đi để không bị
kích hoạt trùng.

## Cách dùng

**Cách thường dùng**: trò chuyện bình thường. Khi planner cần hỏi, câu hỏi hiện ra dưới dạng
lựa chọn.

```
/bangiao:lap-ke-hoach thêm nút xuất Excel cho danh sách đơn hàng
```

Hoặc nói tự nhiên, ví dụ "lên plan cho tính năng …". Skill tự kích hoạt, giao việc cho
planner chạy trong ngữ cảnh riêng, rồi chuyển câu hỏi qua lại giữa bạn và planner. Hội thoại
chính không bị làm đầy bởi các file planner đọc lúc khảo sát.

**Chạy planner làm luồng chính** (planner tự hỏi trực tiếp, không cần chuyển lời):

```bash
claude --agent bangiao:planner
```

**Từ agent khác** (như `ship` sau này): gọi subagent `bangiao:planner`, xử lý báo cáo theo
[giao thức bàn giao](docs/giao-thuc-ban-giao.md). Thêm "không hỏi" vào prompt khi chạy tự
động mà không có người trả lời.

**Chặng Code**: sau khi kế hoạch hết câu hỏi bỏ ngỏ:

```
/bangiao:code
/bangiao:code chỉ làm T1–T3
```

Hoặc nói "code theo kế hoạch", "làm tiếp đi". Muốn chạy coder làm luồng chính thì dùng
`claude --agent bangiao:coder`.

## Cấu trúc

```
.claude-plugin/
  plugin.json              manifest của plugin bangiao
  marketplace.json         repo này đồng thời là marketplace
agents/
  planner.md               agent planner (Opus, effort high, có sổ tay nhớ qua các dự án)
  coder.md                 agent coder (Sonnet, effort high, có sổ tay bài học gỡ lỗi)
skills/
  lap-ke-hoach/SKILL.md    lệnh /bangiao:lap-ke-hoach, chuyển lời giữa bạn và planner
  code/SKILL.md            lệnh /bangiao:code, chạy coder và tự vòng về planner khi bị chặn
references/planner/        hướng dẫn theo loại yêu cầu và bảng kiểm câu hỏi
hooks/hooks.json           hook PreToolUse: ràng buộc cứng theo từng agent
scripts/chan-agent.mjs     logic của hook (luật planner, luật coder)
tests/                     test cho hook (node --test)
docs/giao-thuc-ban-giao.md hợp đồng chung giữa các agent: file .bangiao/, trạng thái, khối câu hỏi
```

## Phát triển

Thử plugin tại chỗ mà không cần cài:

```bash
claude --plugin-dir .
```

Kiểm tra trước khi push:

```bash
claude plugin validate .
```

```bash
node --test
```

Khi sửa định dạng `ke-hoach.md` hay báo cáo trạng thái, cập nhật
[docs/giao-thuc-ban-giao.md](docs/giao-thuc-ban-giao.md) và các agent đang dựa vào chúng.
Nâng `version` trong `.claude-plugin/plugin.json` mỗi lần phát hành, vì người dùng chỉ nhận
bản mới khi version đổi.
