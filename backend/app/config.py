"""Centralized application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-supabase-service-role-key"
    supabase_anon_key: str = "your-supabase-anon-key"

    # Gemini
    gemini_api_key: str = "your-gemini-api-key"

    # JWT
    jwt_secret: str = "change-this-to-a-random-secret-string"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Model Config
    yolo_weights_path: str = "yolov8n.pt"
    confidence_threshold: float = 0.40

    # CORS
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
