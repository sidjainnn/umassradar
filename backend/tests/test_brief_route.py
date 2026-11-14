import time

from app.routes import brief as brief_route


async def test_refresh_is_skipped_while_one_is_running():
    brief_route._running.add("u1")
    try:
        t = time.perf_counter()
        await brief_route.refresh_brief("u1")  # returns immediately, no DB or Gemini call
        assert time.perf_counter() - t < 0.01
    finally:
        brief_route._running.discard("u1")


def test_schedule_refresh_without_loop_is_a_noop():
    brief_route.schedule_refresh("u1")  # no running loop: must not raise
