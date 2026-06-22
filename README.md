# Side Quest System of Life

> Gamify your learning journey — turn any goal into a tree-shaped quest line with the help of AI agents.

A multi-agent learning pathway generator and progress tracker. Tell the system what you want to learn, and three specialized AI agents collaborate to break it down into a structured, game-like quest tree with streak tracking.

`
User: "I want to learn C++"
  → Goal Clarifier: asks about timeline, level, and learning style
  → Pathway Planner: builds a 5–10 module JSON pathway
  → Task Quantifier: splits each module into 3–8 micro-tasks
  → Rendered as an interactive quest list with check-off tracking
`

## Tech Stack

| Layer | Technology |
|---|---|
| Agent Engine | Python 3.12 + OpenAI SDK (Agent-as-Tool pattern) |
| Backend API | FastAPI |
| Database | Supabase (PostgreSQL) |
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| Deployment | Docker Compose |

## Project Structure

`
side-quest-system-of-life/
├── backend/app/
│   ├── agents/               # 3 Agents + Orchestrator + GoalTreeGenerator
│   ├── routes/               # FastAPI routers (agent, pathway, progress, user)
│   ├── schemas/              # Pydantic models
│   ├── db/                   # Supabase client, SQL schema, DB models
│   ├── main.py               # FastAPI entry point
│   └── config.py             # Environment config
├── frontend/src/
│   ├── app/                  # Next.js App Router pages (layout, home, new, [name])
│   ├── components/           # AgentChat, Dashboard, PathwayView, ThemeToggle
│   ├── context/              # Theme context (dark/light mode)
│   ├── lib/                  # API client, env helpers
│   └── types/                # TypeScript type definitions
├── docker-compose.yml
├── start.bat                 # One-click launcher (Windows)
└── README.md
`

## Quick Start

### Prerequisites

- Python 3.12+, Node.js 22+
- A Supabase project (free tier)
- An OpenAI API key

### 1. Backend

`ash
cd backend
cp .env.example .env
# Edit .env with your OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt

# Run the schema migration in your Supabase SQL editor (db/schema.sql)
uvicorn app.main:app --reload
`

### 2. Frontend

`ash
cd frontend
npm install
npm run dev        # → http://localhost:3000
# API requests are proxied to the backend via next.config.ts rewrites
`

### 3. Docker

`ash
docker compose up -d
`

### 4. Windows Quick Start

Double-click start.bat — it installs backend dependencies, starts uvicorn on port 8000, and launches the Next.js dev server on port 3000.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/agent/chat | Chat with the agent pipeline; returns reply + suggested pathway |
| GET | /api/pathways/{id} | Retrieve a pathway tree (modules + tasks) |
| GET | /api/pathways/user/{id} | Get all pathways for a user |
| PATCH | /api/pathways/tasks/{id} | Toggle a task's completion status |
| GET | /api/progress/{user_id} | Get stats: streak, completion %, learning log |
| POST | /api/users/ | Create or look up a user profile |
| GET | /api/health | Health check |

## Agent Pipeline

`
[Goal Clarifier]   — chats with the user to collect subject, level, time, and style
       ↓ [PROFILE_COMPLETE]
[Pathway Planner]  — generates a 5–10 module JSON pathway
       ↓
[Task Quantifier]  — splits each module into 3–8 micro-tasks
       ↓
  Persisted to Supabase → rendered as a check-off quest list in the frontend
`

The pipeline is orchestrated by Orchestrator and a GoalTreeGenerator for advanced branching.

## License

MIT
