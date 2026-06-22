"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import agent, pathway, progress, user

app = FastAPI(
    title="Side Quest System of Life",
    description="Multi-agent learning pathway generator & progress tracker",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(pathway.router)
app.include_router(progress.router)
app.include_router(user.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "side-quest-system-of-life"}
