from fastapi import APIRouter

from app.api import auth, chatroom, profile

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chatroom.router, prefix="/chatrooms", tags=["chatrooms"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
