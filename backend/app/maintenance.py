"""Run a retry pass from a scheduler: PYTHONPATH=backend python -m app.maintenance."""
import logging
from . import account_deletion, checkin_worker, push_worker
from .journeys import maya

def run():
    success = True
    for worker in (account_deletion, checkin_worker, push_worker, maya):
        try: worker.run()
        except Exception:
            success = False
            logging.getLogger('uvicorn.error').error('Maintenance pass failed: %s', worker.__name__)

    return success

if __name__ == '__main__': run()
