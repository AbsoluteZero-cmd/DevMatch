from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    PROJECT_NAME: str = "DevMatch"
    VERSION: str = "1.0.0"
    API_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql://user:password@db:5432/devmatch_db"

    GROQ_API_KEY: str = ""  # Set in .env — never expose to client (NFR-15)

    SECRET_KEY: str = "SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    OAUTH_TOKEN_ENCRYPTION_KEY: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    HUGGINGFACE_CLIENT_ID: Optional[str] = None
    HUGGINGFACE_CLIENT_SECRET: Optional[str] = None
    OAUTH_CALLBACK_BASE_URL: str = "http://localhost:8000"
    FRONTEND_BASE_URL: str = "http://localhost:3001"

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3001",
        "http://localhost:8000",
        "*",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
