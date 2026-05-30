"""Centralized application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-supabase-service-role-key"
    supabase_anon_key: str = "your-supabase-anon-key"

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "z-ai/glm-4.5-air:free"
    openrouter_site_url: str = "http://localhost:5173"
    openrouter_app_name: str = "XRayVision AI"
    openrouter_timeout_seconds: float = 60.0

    # Hugging Face
    hf_token: str | None = None

    # JWT
    jwt_secret: str = "change-this-to-a-random-secret-string"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Model Config
    yolo_weights_path: str = "models/fracture_yolov8.pt"
    allow_generic_yolo_weights: bool = False
    fracture_classifier_enabled: bool = True
    fracture_classifier_model_name: str = "prithivMLmods/Bone-Fracture-Detection"
    wound_model_name: str = "PayamFard123/dermaintel-wound-classifier"
    confidence_threshold: float = 0.40

    # CORS
    frontend_url: str = "http://localhost:5173"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    if settings.hf_token:
        os.environ.setdefault("HF_TOKEN", settings.hf_token)
        os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", settings.hf_token)
    return settings
