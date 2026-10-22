"""Safe operation timings; no request bodies, query strings or credentials."""
import asyncio
import logging
from contextlib import asynccontextmanager
from time import perf_counter

logger = logging.getLogger('uvicorn.error')


@asynccontextmanager
async def waiting(label, interval=10):
    started = perf_counter()
    async def heartbeat():
        while True:
            await asyncio.sleep(interval)
            logger.info('%s outcome=waiting elapsed_ms=%s', label, round((perf_counter() - started) * 1000))
    task = asyncio.create_task(heartbeat())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
