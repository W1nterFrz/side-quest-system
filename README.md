<<<<<<< HEAD
# Side Quest System of Life

> 将人生技能学习游戏化 —— 多 Agent 驱动的学习路径生成 + 即时反馈追踪系统

## Concept

人生就像一场开放世界 RPG —— 但缺少 quest log。这个项目通过 **3 个 AI Agent** 将模糊的学习目标转化为可量化的任务清单，并以游戏化的 streak 和仪表盘让用户保持动力。

```
用户："我想学 C++"
  → Goal Clarifier: 询问级别、时间、风格
  → Pathway Planner: 生成模块化学习路线
  → Task Quantifier: 拆分为 micro-tasks
  → 输出可追踪的 Quest 列表
```

## Tech Stack

| 层 | 技术 |
|---|---|
| Agent 核心 | Python 3.12 + OpenAI SDK (多 Agent 编排) |
| Backend API | FastAPI |
| Database | Supabase (PostgreSQL) |
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| 部署 | Docker Compose |

## Project Structure

```
side-quest-system-of-life/
├── backend/app/
│   ├── agents/              ← 3 Agent + Orchestrator
│   ├── routes/               ← FastAPI (chat / pathway / progress / user)
│   ├── schemas/              ← Pydantic models
│   ├── db/                   ← Supabase client + schema.sql
│   ├── main.py               ← FastAPI entry
│   └── config.py             ← Env config
├── frontend/src/
│   ├── app/layout.tsx        ← Root layout
│   ├── app/page.tsx          ← Tabbed UI (Quest / Pathway / Progress)
│   ├── components/
│   │   ├── AgentChat.tsx     ← 对话界面 + 3 阶段 Agent 流程
│   │   ├── PathwayView.tsx   ← Quest 任务列表 + 展开/勾选
│   │   └── Dashboard.tsx     ← 统计面板 + Streak
│   ├── lib/api.ts            ← API client
│   └── types/index.ts        ← TypeScript types
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.12+, Node.js 22+
- Supabase project (free tier)
- OpenAI API key

### 1. Backend

```bash
cd backend
cp .env.example .env
# 编辑 .env → OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# 在 Supabase SQL Editor 运行 db/schema.sql 建表
uvicorn app.main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
# API 请求自动 proxy 到 backend (next.config.ts rewrites)
```

### 3. Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent/chat` | Agent 对话 → 返回回复 + 可能含 pathway |
| `GET` | `/api/pathways/{id}` | 完整 pathway tree (modules + tasks) |
| `GET` | `/api/pathways/user/{id}` | 用户的所有 pathway |
| `PATCH` | `/api/pathways/tasks/{id}` | 切换 task 完成状态 |
| `GET` | `/api/progress/{user_id}` | 统计数据: streak, %, 最近日志 |
| `POST` | `/api/users/` | 创建/更新用户档案 |
| `GET` | `/api/health` | 健康检查 |

## 3-Agent Pipeline

```
[Goal Clarifier]  ← 用户对话 (收集 subject/level/time/style)
       ↓ [PROFILE_COMPLETE]
[Pathway Planner]  ← 生成 5-10 模块 JSON
       ↓
[Task Quantifier]  ← 逐模块拆分为 3-8 micro-tasks
       ↓
  存入 Supabase → 前端渲染可勾选任务列表
```

## License

MIT
=======
# side-quest-system
This is a self-learning system based on agent skills where allows learner to customize their leaning pattern through chatting with agents, and a tree-shape learning curve/game-like-mission would be generated
>>>>>>> 4a35632efee56a1c010145a1e2d014cd792e005d
