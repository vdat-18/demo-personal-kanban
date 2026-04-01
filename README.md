# AgentForEveryone

**AgentForEveryone** là một trợ lý công việc AI cá nhân dựa trên bảng Kanban, được thiết kế cho người dùng không rành về kỹ thuật (non-tech). Thay vì phải tự mình tìm cách thực hiện các tác vụ, AI sẽ đồng hành cùng bạn để khám phá, lập kế hoạch và thực thi từng bước một.

---

## 🏗️ Cấu trúc dự án (Architecture)

Dự án được xây dựng theo mô hình Monorepo hiện đại:

```text
/demo-personal-kanban (Root)
├── pyproject.toml        # Quản lý môi trường Python (UV) & Linting (Ruff)
├── app/                  # [PYTHON BACKEND] Lõi AI Orchestrator
│   ├── main.py           # API Entry Point (FastAPI)
│   ├── agents/           # Trí thông minh AI (Starter, Planner, Doer, Reviewer...)
│   │   ├── base.py       # Interface cơ sở cho Agent
│   │   ├── registry.py   # Quản lý và khởi tạo Agent theo vai trò
│   │   └── definitions/  # Logic thực thi chi tiết của từng Agent
│   ├── core/             # Logic điều phối (Orchestrator) hệ thống
│   └── schemas/          # Định nghĩa dữ liệu Pydantic (Project, Task...)
├── frontend/             # [REACT FRONTEND] Giao diện người dùng Premium
│   ├── src/
│   │   ├── pages/        # Các màn hình: Home, Planning, Mission Control, Directory...
│   │   ├── store/        # Quản lý trạng thái (Zustand)
│   │   └── layouts/      # Khung giao diện dùng chung
│   └── tailwind.config.js # Cấu hình giao diện Tailwind v4
└── README.md             # (File này)
```

---

## 🎨 Luồng công việc (Standard Workflow)

Hệ thống hoạt động dựa trên triết lý **"Mỗi cột Kanban là một AI Agent"**:

1.  **Giai đoạn Lập kế hoạch**: Talk with AI -> Viết báo cáo -> Tự động tạo Task Board.
2.  **Giai đoạn Thực thi (Mission Control)**:
    *   `🎯 Starter`: Phân tích và đề xuất bước đầu.
    *   `🗺️ Planner`: Chia nhỏ Task thành các Subtasks chi tiết.
    *   `⚡ Doer`: Thực hiện công việc và tạo ra kết quả (Artifacts).
    *   `🔍 Reviewer`: Kiểm tra chất lượng dựa trên tiêu chí định sẵn.
    *   `✅ Reporter`: Tổng kết kết quả và gợi ý bước tiếp theo.

---

## 🚀 Hướng dẫn khởi chạy

### 1. Backend (Python API)

Yêu cầu: [UV](https://github.com/astral-sh/uv) (Trình quản lý gói Python hiện đại).

```bash
# Cài đặt môi trường và thư viện (từ thư mục gốc)
uv sync

# Khởi chạy server API
uv run uvicorn app.main:app --reload
```
*API sẽ chạy tại: `http://localhost:8000`*

### 2. Frontend (React)

Yêu cầu: Node.js & npm/pnpm.

```bash
cd frontend

# Cài đặt thư viện
npm install

# Khởi chạy giao diện
npm run dev
```
*Giao diện sẽ chạy tại: `http://localhost:5173`*

---

## 🛠️ Công nghệ sử dụng

*   **Frontend**: React 19, Vite, Tailwind CSS v4, Zustand.
*   **Backend**: Python 3.11+, FastAPI, Pydantic v2.
*   **AI**: LangChain core, OpenAI SDK.
*   **Tooling**: UV (Package manager), Ruff (Linter & Formatter), Git (Version control).

---

## 📖 Tài liệu liên quan
- Chi tiết sản phẩm: [planning_kanban_v2.md](file:///Users/dat.nguyen1/Desktop/demo-personal-kanban/input_docs/dat_planning/planning_kanban_v2.md)
- Tham khảo kiến trúc: [cline-kanban-reference](https://github.com/cline/kanban)
