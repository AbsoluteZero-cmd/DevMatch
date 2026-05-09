from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    PROJECT_NAME: str = "DevMatch"
    VERSION: str = "1.0.0"
    API_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql://user:password@db:5432/devmatch_db"

    SECRET_KEY: str = "SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "*",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
