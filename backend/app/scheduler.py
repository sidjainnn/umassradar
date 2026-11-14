"""Background jobs: email sync at 6 AM then every 30 minutes until midnight; page watchers twice a day (Eastern)."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db import get_db
from app.models import EASTERN
from app.sync import sync_user
from app.campus_events import refresh_and_share
from app.watchers import run_watchers

log = logging.getLogger("radar.scheduler")


async def sync_everyone() -> None:
    users = get_db().users.find({"demo": {"$ne": True}, "needs_reconnect": {"$ne": True}}, {"_id": 1})
    async for user in users:
        try:
            result = await sync_user(user["_id"])
            log.info("scheduled sync %s: %s", user["_id"], result.get("status"))
        except Exception:
            log.exception("scheduled sync failed for %s", user["_id"])


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=EASTERN)
    scheduler.add_job(sync_everyone, CronTrigger(hour=6, minute=0, timezone=EASTERN), id="morning",
                      max_instances=1, coalesce=True)
    scheduler.add_job(sync_everyone, CronTrigger(hour="7-23", minute="0,30", timezone=EASTERN), id="daytime",
                      max_instances=1, coalesce=True)
    scheduler.add_job(run_watchers, CronTrigger(hour="7,15", minute=5, timezone=EASTERN), id="watchers",
                      max_instances=1, coalesce=True)
    scheduler.add_job(refresh_and_share, CronTrigger(hour="6,12,18", minute=15, timezone=EASTERN), id="campus_events",
                      max_instances=1, coalesce=True)
    scheduler.start()
    return scheduler
