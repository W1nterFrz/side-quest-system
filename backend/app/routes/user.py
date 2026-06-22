"""User profile endpoints."""

from fastapi import APIRouter, HTTPException

from ..db.supabase_client import get_supabase
from ..schemas.pydantic_models import UserProfileCreate, UserProfileResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/", response_model=UserProfileResponse)
async def create_or_update_user(profile: UserProfileCreate):
    """Upsert a user profile."""
    supabase = get_supabase()
    existing = supabase.table("user_profiles").select("id").eq("email", profile.email).execute()
    if existing.data:
        result = (
            supabase.table("user_profiles")
            .update(profile.model_dump())
            .eq("email", profile.email)
            .execute()
        )
    else:
        result = supabase.table("user_profiles").insert(profile.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create/update user.")
    return result.data[0]
