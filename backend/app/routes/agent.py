"""Chat endpoint for agent interaction."""

from fastapi import APIRouter, HTTPException

from ..agents.orchestrator import AgentOrchestrator
from ..schemas.pydantic_models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/agent", tags=["agent"])
orchestrator = AgentOrchestrator()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(req: ChatRequest):
    """Send a message to the specified agent phase."""
    try:
        result = await orchestrator.handle_message(
            conversation_id=req.conversation_id,
            agent=req.agent,
            message=req.message,
            user_profile=req.user_profile,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
