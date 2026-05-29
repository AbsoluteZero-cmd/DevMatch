import asyncio
import sys

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import SessionLocal
from app.api.router import api_router
from app.api.ws import router as ws_router

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)

_logger = logging.getLogger(__name__)


# FR-51: Background task to expire offers after 7 days
async def _offer_expiry_checker():
    from app.db.session import SessionLocal
    from app.models.offer import Offer, OfferStatus
    from datetime import datetime

    while True:
        await asyncio.sleep(3600)  # Check every hour
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            expired_offers = (
                db.query(Offer)
                .filter(Offer.status == OfferStatus.PENDING, Offer.expires_at < now)
                .all()
            )
            for offer in expired_offers:
                offer.status = OfferStatus.EXPIRED
                _logger.info(f"Offer {offer.id} has expired.")
            db.commit()
        except Exception as e:
            _logger.error(f"Error checking for expired offers: {e}")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    asyncio.create_task(_offer_expiry_checker())

    db = SessionLocal()
    try:
        yield
    finally:
        db.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_STR}/openapi.json",
    docs_url=f"{settings.API_STR}/docs",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router, tags=["websocket"])

app.include_router(api_router, prefix=settings.API_STR)


@app.get("/health")
def health_check():
    return {"status": "ok"}
