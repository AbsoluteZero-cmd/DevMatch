from fastapi import APIRouter

from app.api import auth, chatroom, profile, ai, team

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chatroom.router, prefix="/chatrooms", tags=["chatrooms"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["oauth"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(ai.router, prefix="/profile", tags=["ai"])
api_router.include_router(team.router, prefix="/teams", tags=["teams"])
