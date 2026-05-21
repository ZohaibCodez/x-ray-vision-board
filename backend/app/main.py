"""XRayVision AI — FastAPI Application Entry Point.

Initializes the FastAPI app with CORS, model preloading, and all routers.
"""

from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("xrayvision")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload AI models on startup for faster first inference."""
    logger.info("🚀 XRayVision AI backend starting...")
    logger.info("📦 Preloading AI models (this may take a minute)...")

    try:
        from app.services.chest_model import _get_model as load_chest
        load_chest()
        logger.info("✅ DenseNet121 (Chest Pathology) loaded")
    except Exception as e:
        logger.warning(f"⚠️ DenseNet121 failed to preload: {e}")

    try:
        from app.services.fracture_model import _get_model as load_fracture
        load_fracture()
        logger.info("✅ YOLOv8 (Fracture Detection) loaded")
    except Exception as e:
        logger.warning(f"⚠️ YOLOv8 failed to preload: {e}")

    try:
        from app.services.wound_model import _get_model as load_wound
        load_wound()
        logger.info("✅ ViT (Wound Classification) loaded")
    except Exception as e:
        logger.warning(f"⚠️ ViT failed to preload: {e}")

    logger.info("🟢 XRayVision AI is ready to serve requests!")
    yield
    logger.info("🔴 XRayVision AI shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="XRayVision AI",
        description=(
            "Advanced medical diagnostic API using a Hybrid Multi-Model Ensemble. "
            "DenseNet121 for chest pathology, YOLOv8 for fracture detection, "
            "ViT for wound classification, and Gemini 1.5 Flash for agentic synthesis."
        ),
        version="2.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_url,
            "http://localhost:5173",
            "http://localhost:3000",
            "https://*.vercel.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.routers import auth, analyze, scans, chat, diet, stats

    app.include_router(auth.router)
    app.include_router(analyze.router)
    app.include_router(scans.router)
    app.include_router(chat.router)
    app.include_router(diet.router)
    app.include_router(stats.router)

    @app.get("/", tags=["health"])
    async def health():
        return {
            "status": "healthy",
            "service": "XRayVision AI",
            "version": "2.1.0",
            "models": ["DenseNet121", "YOLOv8", "ViT", "Gemini 1.5 Flash"],
        }

    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
