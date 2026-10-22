"""Preparation diagnostics without tokens, provider bodies or personal inputs."""
import logging
import traceback
from contextlib import contextmanager
from pathlib import Path
from time import perf_counter
from pydantic import ValidationError
from .models import Leg

logger = logging.getLogger('uvicorn.error')


def event(key, stage, outcome, **fields):
    details = ' '.join(f'{name}={value}' for name, value in fields.items())
    logger.info('journey=%s stage=%s outcome=%s %s', key, stage, outcome, details)


def failure(key, stage, error, elapsed_ms=None):
    # Exception messages can contain URLs with API keys, model output or coordinates.
    # Keep actionable types/statuses and stack locations, without those messages.
    response = getattr(error, 'response', None)
    status = getattr(error, 'status_code', None) or getattr(response, 'status_code', None)
    frames = ' > '.join(f'{Path(f.filename).name}:{f.lineno}:{f.name}'
                        for f in traceback.extract_tb(error.__traceback__)[-8:])
    logger.error('journey=%s stage=%s outcome=failed error_type=%s status=%s elapsed_ms=%s frames=%s',
                 key, stage, type(error).__name__, status, elapsed_ms, frames)
    # Pydantic summaries omit rejected input and model-generated text.
    if callable(getattr(error, 'errors', None)):
        issues = error.errors(include_input=False, include_url=False, include_context=False)
        logger.error('journey=%s stage=%s validation_types=%s', key, stage,
                     ','.join(str(issue.get('type')) for issue in issues))
        # Only log allowlisted codes from our own validator. Raw Pydantic
        # messages/context may include model output or personal input.
        if isinstance(error, ValidationError) and error.title == Leg.__name__:
            codes = {'Value error, duplicate_transport_option_ids': 'duplicate_transport_option_ids',
                     'Value error, unknown_selected_transport_option': 'unknown_selected_transport_option'}
            for issue in issues:
                code = codes.get(issue.get('msg'))
                if code:
                    logger.error('journey=%s stage=%s validation_code=%s', key, stage, code)


@contextmanager
def stage(key, name, **fields):
    started = perf_counter()
    event(key, name, 'started', **fields)
    try:
        yield
    except BaseException as error:
        failure(key, name, error, round((perf_counter() - started) * 1000))
        raise
    else:
        event(key, name, 'completed', elapsed_ms=round((perf_counter() - started) * 1000))
