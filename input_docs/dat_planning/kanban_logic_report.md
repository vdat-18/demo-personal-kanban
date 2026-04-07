# Kanban Logic Report — Agent-First với Human Confirm

> **Mục tiêu tài liệu:** Định nghĩa đầy đủ logic vận hành của Kanban board cho non-tech user, theo triết lý **Agent-First** — Agent đề xuất và thực thi, Human đọc, confirm, và được phép điều chỉnh bất cứ lúc nào.

---

## 1. Triết lý thiết kế

### 1.1 Agent-First là gì?

> **Agent làm việc. Human chỉ đạo.**

Trong hầu hết các Kanban truyền thống, user tự kéo task, tự viết comment, tự theo dõi tiến độ. Với hệ thống này, tư duy ngược lại:

- **Agent phân tích** → đề xuất bước tiếp theo
- **Human confirm** → Agent thực thi
- **Human không ưng ý** → Human điều chỉnh → Agent thực hiện lại
- **Human cũng có thể kéo task** → Agent nhận biết và tự động khai mạc session mới

Điểm quan trọng: **Human không bao giờ bị bỏ lại với màn hình trống.** Mỗi khi task chuyển cột (dù do Agent đề xuất hay Human kéo), Agent của cột đó tức thời bắt đầu phân tích và tương tác.

### 1.2 Vai trò rõ ràng

| Vai trò | Làm gì | Không làm gì |
|---|---|---|
| **Agent** | Phân tích, lên kế hoạch, thực thi, đề xuất move | Không tự move task mà không hỏi Human |
| **Human** | Confirm, từ chối, điều chỉnh hướng, kéo task | Không cần tự nghĩ ra bước tiếp theo |

---

## 2. Cấu trúc cột Kanban

### 2.1 Sơ đồ cột

```
+----------+----------+----------+----------+----------+----------+
|  TO DO   | PLANNING |  DOING   |  REVIEW  |   DONE   | CANCEL   |
|  Rocket  |  Book    |  Zap     |  Search  | Check    |  X       |
| Starter  | Planner  |  Doer    | Reviewer | Reporter |  --      |
|  Agent   |  Agent   |  Agent   |  Agent   |  Agent   |          |
+----------+----------+----------+----------+----------+----------+
```

### 2.2 Vai trò từng Agent

| Cột | Agent | Nhiệm vụ chính |
|---|---|---|
| **To Do** | Starter Agent | Tiếp nhận task, phân tích yêu cầu, làm rõ scope, đề xuất chuyển sang Planning |
| **Planning** | Planner Agent | Lên kế hoạch chi tiết, chia subtask, xác định nguồn lực, đề xuất bắt đầu thực hiện |
| **Doing** | Doer Agent | Thực thi từng subtask, soạn thảo / nghiên cứu / tổng hợp, đề xuất gửi Review khi xong |
| **Review** | Reviewer Agent | Kiểm tra output theo tiêu chí, phán quyết Pass/Fail, đề xuất hướng xử lý tiếp |
| **Done** | Reporter Agent | Tổng kết kết quả, lưu learning, tạo báo cáo, gợi ý bước tiếp theo của dự án |
| **Cancelled** | System | Ghi nhận lý do huỷ, lưu lịch sử để tham khảo |

---

## 3. Luồng trạng thái (State Machine)

### 3.1 Sơ đồ đầy đủ

```
[Task tạo ra]
     |
     v
  [TO DO] ---> [PLANNING] ---> [DOING] ---> [REVIEW] ---> [DONE]
                   |               |              |
                   |               |              | (Plan sai gốc)
                   |               |              v
                   |               |          [PLANNING] <--+
                   |               |              |          |
                   |               |              | (Output  |
                   |               |              |  chưa    |
                   |               |              |  đạt)    |
                   |               |              v          |
                   |               +--------> [DOING] ------+
                   |
                   +---> [CANCELLED] (từ bất kỳ cột nào)
```

### 3.2 Điều kiện chuyển cột

| Từ | Sang | Điều kiện | Ai quyết định |
|---|---|---|---|
| To Do | Planning | Starter Agent phân tích xong, đề xuất | Agent đề xuất, Human confirm |
| Planning | Doing | Planner Agent có plan đầy đủ, đề xuất | Agent đề xuất, Human confirm |
| Doing | Review | Doer Agent hoàn thành output, đề xuất | Agent đề xuất, Human confirm |
| Review | Done | Reviewer Agent pass | Agent đề xuất, Human confirm |
| Review | Doing | Reviewer thấy output chưa đạt (sai nhỏ) | Agent đề xuất, Human confirm |
| Review | Planning | Reviewer thấy plan sai từ gốc (sai lớn) | Agent đề xuất, Human confirm |
| Bất kỳ cột nào | Cancelled | Human quyết định dừng hoặc Agent phát hiện không khả thi | Human hoặc Agent đề xuất, Human confirm |

### 3.3 Phân biệt Review → Doing vs Review → Planning

Đây là điểm quan trọng nhất trong logic Review:

**Reviewer Agent phán quyết Review → Doing khi:**
- Output bị lỗi nhỏ: typo, thiếu số liệu, format sai
- Nội dung đúng hướng nhưng chưa đủ chất lượng
- Một số subtask chưa hoàn thành

**Reviewer Agent phán quyết Review → Planning khi:**
- Scope task đã thay đổi so với khi lên kế hoạch
- Kế hoạch ban đầu thiếu một yếu tố lớn quan trọng
- Output đúng kế hoạch nhưng kế hoạch sai so với mục tiêu thực tế
- Human phản hồi muốn đổi hướng hoàn toàn

---

## 4. Cơ chế tương tác Agent - Human

### 4.1 Khi task vào cột mới (dù do Agent đề xuất hay Human kéo)

```
Bước 1: Task chuyển vào cột mới
Bước 2: Agent của cột đó TỰ ĐỘNG khởi động session
Bước 3: Agent gửi tin nhắn khai mạc:
        - Tóm tắt context của task (title, description, why, lịch sử từ cột trước)
        - Phân tích sơ bộ
        - Câu hỏi đầu tiên hoặc đề xuất hành động
Bước 4: Human phản hồi
        (hoặc không — Agent vẫn có thể bắt đầu làm nếu đủ context)
```

**Ví dụ — Starter Agent khai mạc khi task vào To Do:**

> "Xin chào! Tôi là Starter Agent phụ trách task: **Cài đặt và tối ưu hóa chiến dịch Facebook Ads cho nhà tuyển dụng**.
>
> Đây là điều tôi hiểu về task này: [tóm tắt description + why]
>
> Trước khi chuyển sang lên kế hoạch, tôi cần làm rõ: Ngân sách cho chiến dịch là bao nhiêu, và target audience chính là ai?
>
> Hoặc nếu bạn đã sẵn sàng, tôi có thể bắt đầu lên kế hoạch ngay với thông tin hiện có."

### 4.2 Vòng lặp confirm chuẩn

```
Agent phân tích / thực hiện
         |
         v
Agent đề xuất hành động:
"Tôi đề xuất [X]. Bạn đồng ý không?"
         |
    +----+----+
    |         |
 Confirm    Từ chối / Điều chỉnh
    |         |
    v         v
  Agent     Agent hỏi thêm
 thực thi   hoặc điều chỉnh
            theo ý Human
```

### 4.3 Cấu trúc tin nhắn của Agent (chuẩn hoá)

Mỗi tin nhắn Agent gửi nên theo 4 phần:

| Phần | Nội dung |
|---|---|
| **Báo cáo** | Kết quả công việc vừa làm (nếu có) |
| **Phân tích** | Đánh giá, insight về task |
| **Đề xuất** | Hành động tiếp theo cụ thể |
| **Confirm** | "Bạn có muốn [hành động] không?" hoặc "Còn điều gì cần điều chỉnh không?" |

---

## 5. Quyền của Human

### 5.1 Những gì Human có thể làm bất cứ lúc nào

| Hành động | Cách thực hiện | Agent phản ứng thế nào |
|---|---|---|
| **Confirm** đề xuất của Agent | Chat: "Đồng ý", "OK", "Go ahead" | Agent thực thi |
| **Từ chối** đề xuất | Chat: "Không", "Khoan", "Chưa cần" | Agent hỏi muốn làm gì thay |
| **Điều chỉnh hướng** | Chat: "Hãy thay đổi theo hướng X" | Agent điều chỉnh plan/output và trình lại |
| **Yêu cầu làm lại** | Chat: "Làm lại phần Y" | Agent làm lại và trình lại để confirm |
| **Kéo task sang cột khác** | Drag and drop trên board | Agent của cột mới tự động khai mạc |
| **Huỷ task** | Click cancel hoặc chat "Huỷ task này" | System ghi nhận lý do, lưu lịch sử |
| **Thêm thông tin** bổ sung | Chat tự do | Agent tích hợp thông tin và tiếp tục |

### 5.2 Human kéo task — Xử lý thế nào?

Khi Human kéo task sang cột khác (không theo đề xuất của Agent):

**Trường hợp 1 — Kéo theo chiều thuận (forward):**
Ví dụ: Task đang ở To Do, Human kéo thẳng sang Doing (bỏ qua Planning).

```
Agent của cột Doing nhận task.
Doer Agent cảnh báo nhẹ:
  "Task này chưa qua bước Planning. Tôi sẽ cố gắng làm với thông tin hiện có,
   nhưng có thể cần clarification thêm. Bạn có muốn tôi tiếp tục không?"
Human confirm => Doer Agent bắt đầu làm.
```

**Trường hợp 2 — Kéo ngược (backward):**
Ví dụ: Task đang ở Review, Human kéo về Doing.

```
Doer Agent nhận task từ Review.
Doer Agent hỏi: "Bạn muốn làm lại phần nào? Review có để lại feedback gì không?"
Human giải thích => Doer Agent bắt đầu lại.
```

**Trường hợp 3 — Kéo về Cancelled:**

```
System hỏi: "Lý do huỷ task này là gì?"
Human nhập lý do (optional).
Task được archive — không xoá, có thể xem lại lịch sử.
```

### 5.3 Human điều chỉnh output trong khi Agent đang làm

Trong màn hình TaskChat, nếu Agent đang trình bày output (plan, draft nội dung...), Human có thể:

- **Comment trực tiếp:** "Phần này sai, sửa lại là X"
- **Edit thủ công** (nếu UI cho phép inline edit)
- **Yêu cầu Agent viết lại theo prompt mới**

> **Quy tắc vàng:** Agent không bao giờ override lại thay đổi của Human mà không hỏi lại.

---

## 6. Vòng đời đầy đủ của một Task (Step-by-step)

### Ví dụ: Task "Sáng tạo nội dung Facebook Ads bùng nổ"

**Bước 1 — Tạo task**

Hệ thống tạo task sau khi kết thúc Planning Screen. Task vào cột TO DO với `status = "todo"`, `agentType = "Starter Agent"`.

---

**Bước 2 — TO DO (Starter Agent)**

Starter Agent tự động khai mạc:

> "Task: Sáng tạo nội dung Facebook Ads bùng nổ. Mục tiêu: Thu hút sinh viên nộp hồ sơ.
>
> Để bắt đầu tốt, tôi cần biết: (1) Tone của brand? (2) Budget? (3) Deadline cụ thể?"

Human trả lời: *"Trẻ trung, budget 5 triệu, deadline cuối tháng."*

Starter Agent đề xuất:

> "Rõ rồi! Task này cần 3 loại content: hook video, caption, thumbnail. Bạn muốn chuyển sang lên kế hoạch chi tiết chưa?"

Human confirm: *"OK, chuyển sang Planning đi."*

Task chuyển sang `status = "planning"`, `agentType = "Planner Agent"`.

---

**Bước 3 — PLANNING (Planner Agent)**

Planner Agent khai mạc (đọc context từ Starter Agent):

> "Tôi thấy: target sinh viên, tone trẻ trung, budget 5tr, deadline cuối tháng.
>
> Kế hoạch đề xuất:
> - Subtask 1: Viết 3 hook video (15 giây mỗi cái)
> - Subtask 2: Viết 5 caption cho Facebook post
> - Subtask 3: Thiết kế brief cho 3 thumbnail
>
> Timeline: Hook (ngày 1-3), Caption (ngày 4-5), Thumbnail (ngày 6-7). Bạn muốn điều chỉnh gì không?"

Human confirm: *"Bắt đầu đi."*

Task chuyển sang `status = "doing"`, `agentType = "Doer Agent"`.

---

**Bước 4 — DOING (Doer Agent)**

Doer Agent khai mạc (đọc plan từ Planner Agent):

> "OK! Bắt đầu với Subtask 1 — 3 hook video. Bạn muốn hook kiểu câu hỏi hay gây tò mò? Hoặc tôi viết thử cả 2 để bạn chọn?"

Human trả lời: *"Viết thử cả 2 đi."*

Doer Agent thực thi, trình bày 6 hook draft.

Human phản hồi: *"Hook tò mò hay hơn, nhưng câu số 2 sửa lại nhé: bỏ chữ 'bí mật' đi."*

Doer Agent cập nhật, tiếp tục làm Caption và Thumbnail brief.

Doer Agent báo xong:

> "Đã hoàn thành 3 hooks, 5 captions, 3 thumbnail briefs. Bạn muốn tôi gửi lên Review không?"

Task chuyển sang `status = "review"`, `agentType = "Reviewer Agent"`.

---

**Bước 5a — REVIEW → DONE (pass)**

Reviewer Agent kiểm tra toàn bộ output:

> "Output nhìn chung tốt. Hooks đúng tone, captions có CTA rõ ràng, thumbnail briefs đủ thông tin cho designer.
>
> Chỉ 1 điểm nhỏ: Caption số 3 thiếu hashtag. Đề xuất: (a) Để tôi bổ sung hashtag rồi đánh dấu Done, hoặc (b) Gửi lại Doer để sửa. Bạn chọn?"

Human confirm: *"Làm luôn đi, (a)."*

Reviewer Agent bổ sung hashtag. Task chuyển sang `status = "done"`, `agentType = "Reporter Agent"`.

---

**Bước 5b — REVIEW → PLANNING (fail lớn — ví dụ song song)**

Giả sử Human sau khi đọc output mới biết: brand đã đổi định hướng, không còn target sinh viên nữa mà target HR manager.

Reviewer Agent nhận phản hồi:

> "Tôi hiểu. Đây không phải lỗi nhỏ — toàn bộ kế hoạch content cần làm lại từ đầu với audience mới. Tôi đề xuất gửi task về PLANNING để Planner Agent lập kế hoạch mới với target HR manager. Đồng ý không?"

Human confirm. Task về `status = "planning"` với context mới.

---

**Bước 6 — DONE (Reporter Agent)**

Reporter Agent tổng kết:

> "Task hoàn thành! Đây là báo cáo:
>
> - Đã tạo: 3 hook videos, 5 captions, 3 thumbnail briefs
> - Thời gian: 7 ngày (đúng timeline)
> - Điểm cần cải thiện lần sau: Xác nhận audience trước khi bắt đầu
>
> Gợi ý bước tiếp theo cho dự án: Tạo task 'Setup chiến dịch trên Ads Manager' để chạy các content này."

---

## 7. Subtask và Progress

### 7.1 Progress tính thế nào?

Mỗi task có danh sách subtask với trạng thái `completed: true/false`.

```
Progress của task = (số subtask completed) / (tổng số subtask) * 100%
```

**Hiển thị trên board:** Thanh progress bar nhỏ phía dưới mỗi card.

Ví dụ: Task "Sáng tạo content" có 3 subtasks, đã xong 1 → progress = 33%.

### 7.2 Subtask có block việc chuyển cột không?

**Không block cứng.** Nhưng có cảnh báo mềm:

Khi Doer Agent đề xuất chuyển sang Review mà còn subtask chưa xong:

> "Còn 2 subtask chưa hoàn thành. Bạn có muốn gửi lên Review ngay không, hay để tôi hoàn thành nốt trước?"

Human quyết định — Agent tôn trọng.

### 7.3 Ai tạo subtask?

| Thời điểm | Ai tạo | Nội dung |
|---|---|---|
| Khi task được tạo từ Planning Screen | AI (Planner tổng thể) | Subtask ban đầu từ `suggested_subtasks` |
| Khi task vào cột Planning | Planner Agent | Có thể thêm / refine subtask |
| Khi Human muốn thêm | Human chat: "Thêm subtask: X" | Agent tạo và confirm |
| Bất kỳ lúc nào | Human trực tiếp | Inline add trên TaskChat screen |

---

## 8. Xử lý trạng thái đặc biệt

### 8.1 Task bị stuck (không ai làm)

Nếu task ở một cột quá lâu mà không có hoạt động:

- Hệ thống có thể hiển thị badge "Idle X ngày"
- Agent của cột đó có thể gửi reminder: *"Task này đã ở đây X ngày rồi. Bạn cần hỗ trợ gì không?"*

### 8.2 Multiple tasks cùng lúc

Các task trong cùng dự án hoàn toàn độc lập. Một task ở Doing không ảnh hưởng đến task đang ở Planning. Đây là hành vi Kanban chuẩn.

### 8.3 Task Cancelled — có thể khôi phục không?

Có thể. Task bị cancel được archive, không xoá khỏi database. Human có thể:

- Xem lại lịch sử (reason, ngày cancel, ai cancel)
- Restore task về To Do nếu muốn làm lại
- Dùng làm reference cho task mới

---

## 9. Mapping vào Code hiện tại

### 9.1 TaskStatus type

File `frontend/src/types/domain.ts` — type `TaskStatus`:

```typescript
type TaskStatus = "todo" | "planning" | "doing" | "review" | "done" | "cancelled"
```

Mapping trực tiếp với 6 cột Kanban. Không cần thêm status mới.

### 9.2 AGENT_MAPPING

File `frontend/src/constants/agents.ts` — `AGENT_MAPPING`:

```typescript
const AGENT_MAPPING: Record<TaskStatus, string> = {
  todo:      "Starter Agent",
  planning:  "Planner Agent",
  doing:     "Doer Agent",
  review:    "Reviewer Agent",
  done:      "Reporter Agent",
  cancelled: "System",
}
```

Khi `moveTask()` được gọi, `agentType` của task tự động cập nhật theo mapping này.

### 9.3 Auto-kickoff Agent khi task vào cột mới

Hiện tại `TaskChat.tsx` chưa có auto-kickoff. Cần thêm logic:

```
Khi TaskChat screen mount với một task:
  IF task.history không có entry nào từ agent hiện tại:
    Tự động gọi API để Agent gửi tin nhắn khai mạc
    (dùng context: task.title, task.description, task.why, task.history)
```

### 9.4 moveTask và xác nhận từ Agent

Hiện tại `moveTask()` trong store thực hiện ngay lập tức khi gọi. Để hỗ trợ Agent-first:

- Agent đề xuất move trong chat (bằng text)
- Human confirm bằng chat hoặc click button "Move to [next column]"
- UI gọi `moveTask()` sau khi Human confirm
- Agent của cột mới auto-kickoff

### 9.5 Review phán quyết — backward move

`moveTask()` hiện tại cho phép move về bất kỳ status nào. Cần thêm logic trong TaskChat của Reviewer Agent:

```
Khi Reviewer Agent phán quyết fail:
  Phân tích severity:
    - Lỗi nhỏ (output sai) → đề xuất move về "doing"
    - Lỗi lớn (plan sai gốc) → đề xuất move về "planning"
  Hiển thị UI confirm cho Human
  Human confirm → gọi moveTask() với status tương ứng
```

---

## 10. Tóm tắt nhanh (TL;DR)

| Câu hỏi | Trả lời |
|---|---|
| AI có tự move task không? | Không. Agent đề xuất, Human confirm rồi mới move. |
| Human có thể kéo task không? | Có, bất kỳ lúc nào. Agent của cột mới sẽ tự khai mạc. |
| Review fail → về đâu? | Về Doing (lỗi nhỏ) hoặc về Planning (plan sai gốc). Reviewer Agent quyết định. |
| Subtask có block chuyển cột không? | Không block cứng, nhưng Agent cảnh báo nếu còn subtask chưa xong. |
| Task cancelled có mất không? | Không. Được archive, có thể restore. |
| Agent có tự động làm không cần hỏi không? | Có thể, nếu context đủ. Nhưng luôn trình bày kết quả để Human xem và confirm trước khi move. |
