# AgentForEveryone - Frontend

Giao diện người dùng cho ứng dụng **AgentForEveryone**, được thiết kế theo phong cách hiện đại, tinh tế (Premium SaaS).

## 🚀 Công nghệ sử dụng

- **Framework**: React 19 + Vite 6 (TypeScript)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Routing**: React Router v7

## 🛠️ Hướng dẫn cài đặt và chạy

### 1. Di chuyển vào thư mục frontend
Nếu bạn đang ở thư mục gốc của dự án:
```bash
cd frontend
```

### 2. Cài đặt các thư viện (Dependencies)
```bash
npm install
```

### 3. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Sau khi chạy lệnh này, ứng dụng sẽ khả dụng tại: [http://localhost:5173](http://localhost:5173)

### 4. Xây dựng bản production (Build)
```bash
npm run build
```

## 📂 Cấu trúc các màn hình chính

Hiện tại frontend đã bao gồm các màn hình mô phỏng luồng trải nghiệm người dùng:

1.  **Home (`/`)**: Bảng điều khiển tổng quan (Mission Control), nơi bắt đầu dự án mới hoặc tiếp tục dự án hiện có.
2.  **Mission Control (`/mission-control/:id`)**: Giao diện bảng Kanban thực thi dự án, hiển thị tiến độ của các AI Agent.
3.  **Task Chat (`/chat/:id`)**: Giao diện chia đôi màn hình (Split-panel) để chat trực tiếp với AI Agent và xem tiến độ chi tiết của từng task.
4.  **Project Summary (`/summary/:id`)**: Báo cáo tổng kết dự án sau khi hoàn thành với các đề xuất bước tiếp theo.

## 🎨 Design System
Giao diện tuân thủ các nguyên tắc thiết kế:
- **Border**: Siêu mỏng (1px) màu Neutral.
- **Shadow**: Nhẹ, tạo chiều sâu tinh tế.
- **Typography**: Phân cấp rõ ràng, sử dụng font sans-serif hiện đại.
- **Colors**: Chủ đạo là Trắng, Xám nhạt và điểm nhấn Xanh đen (Deep Navy).
