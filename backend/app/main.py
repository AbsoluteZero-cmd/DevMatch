import asyncio
import sys
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import SessionLocal
from app.api.router import api_router
from app.api.ai import _run_batch_analysis_task
from app.api.ws import router as ws_router

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)

_logger = logging.getLogger(__name__)


def _seconds_until_next_3am_utc() -> float:
    now = datetime.now(timezone.utc)
    target = now.replace(hour=3, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 0.0)


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


async def _daily_ai_reanalysis_scheduler():
    while True:
        await asyncio.sleep(_seconds_until_next_3am_utc())
        try:
            await asyncio.to_thread(_run_batch_analysis_task)
            _logger.info("Completed scheduled daily AI re-analysis.")
        except Exception as e:
            _logger.error(f"Error during scheduled AI re-analysis: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    asyncio.create_task(_offer_expiry_checker())
    asyncio.create_task(_daily_ai_reanalysis_scheduler())

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
