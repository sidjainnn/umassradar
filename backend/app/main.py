import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import auth
from app.config import get_settings
from app.db import ensure_indexes
from app.routes import account, ask, brief, clubs, courses, demo, events, housing, imports, items, progress, settings
from app.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    scheduler = start_scheduler() if get_settings().enable_scheduler else None
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="UMass Radar API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(account.router)
app.include_router(settings.router)
app.include_router(brief.router)
app.include_router(demo.router)
app.include_router(imports.router)
app.include_router(courses.router)
app.include_router(clubs.router)
app.include_router(housing.router)
app.include_router(events.router)
app.include_router(progress.router)
app.include_router(ask.router)


@app.get("/health")
async def health():
    s = get_settings()
    return {"ok": True, "google_configured": s.google_configured, "gemini_configured": bool(s.gemini_api_key)}
