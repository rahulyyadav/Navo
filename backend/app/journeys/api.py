import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException
from ..chat_access import chat_user
from .models import PrepareRequest, ApproachRequest, StageRouteRequest
from . import store
from .research import research
from .routing import approach, stage_geometry
from .diagnostics import event, stage, failure

router = APIRouter(prefix='/journey-itineraries', tags=['journeys'])
_tasks = set()
_slots = asyncio.Semaphore(2)

async def prepare(destination, key, uid, origin=None, start_date=None, map_choices=None, route_checkpoint=None):
    research_reserved = False
    try:
        event(key, 'preparation', 'waiting_for_slot')
        async with _slots:
            event(key, 'preparation', 'started')
            with stage(key, 'quota_check'):
                await asyncio.to_thread(store.reserve_research)
                research_reserved = True
            value = await asyncio.wait_for(research(destination, key, uid=uid, origin=origin, start_date=start_date,
                progress=lambda current, count: store.checkpoint(key, current, count), map_choices=map_choices,
                route_checkpoint=route_checkpoint,
                save_route_checkpoint=lambda checkpoint: store.save_route_checkpoint(key, checkpoint)), timeout=295)
            with stage(key, 'cache_save'):
                await asyncio.to_thread(store.finish, value)
            research_reserved = False
            event(key, 'preparation', 'ready')
    except Exception as error:
        if research_reserved:
            try:
                await asyncio.to_thread(store.release_research)
            except Exception:
                event(key, 'quota_release', 'failed')
        failure(key, 'preparation', error)
        detail = error.detail if isinstance(error, HTTPException) else None
        map_choices_required = detail if isinstance(detail, dict) and detail.get('type') == 'map_choice_required' else None
        message = 'Choose which map result matches this route checkpoint.' if map_choices_required else detail if isinstance(detail, str) else ('Journey preparation exceeded its time limit. Your answers are saved; try again later.' if isinstance(error, TimeoutError) else 'We could not prepare a sourced itinerary yet. Please retry.')
        await asyncio.to_thread(store.fail, key, message, map_choices=map_choices_required)

@router.post('/prepare')
async def prepare_destination(value: PrepareRequest, uid: str = Depends(chat_user)):
    key = store.destination_key(value.destination, value.origin, value.startDate)
    event(key, 'prepare_request', 'received')
    # A map-choice retry must reuse the exact researched route and candidate list.
    # Rerunning Julia can change stop queries and invalidate the selection.
    route_checkpoint = None
    resolved_choices = {}
    # Failed attempts may have durable public research checkpoints. Read them on
    # ordinary retries too, not only after an explicit map-choice response.
    previous = await asyncio.to_thread(store.read, key)
    if previous:
        route_checkpoint = previous.get('routeCheckpoint')
        saved_choices = previous.get('selectedMapChoices')
        if isinstance(saved_choices, dict):
            resolved_choices.update(saved_choices)
        prompt = previous.get('mapChoices') or {}
        candidates = prompt.get('candidates') if isinstance(prompt, dict) else None
        stop_index = prompt.get('stopIndex') if isinstance(prompt, dict) else None
        if isinstance(candidates, list) and isinstance(stop_index, int):
            selected_id = value.mapChoices.get(str(stop_index))
            candidate = next((item for item in candidates if isinstance(item, dict) and item.get('id') == selected_id), None)
            if candidate:
                resolved_choices[str(stop_index)] = {
                    'id': candidate['id'], 'name': candidate['name'],
                    'latitude': candidate['latitude'], 'longitude': candidate['longitude'],
                    'stopName': prompt.get('stopName'), 'placeQuery': prompt.get('placeQuery'),
                }
                if route_checkpoint:
                    await asyncio.to_thread(store.save_selected_map_choices, key, resolved_choices)
    if len(_tasks) >= 2:
        row = await asyncio.to_thread(store.read, key)
        if row and row['status'] == 'preparing':
            return await status(key, uid)
        if not row or row['status'] != 'ready':
            raise HTTPException(429, 'Destination research is busy. Please retry shortly.')
    claimed = await asyncio.to_thread(store.claim, key)
    event(key, 'cache_claim', 'claimed' if claimed else 'reused')
    if claimed:
        if len(_tasks) >= 2:
            await asyncio.to_thread(store.fail, key, 'Destination research is busy. Please retry shortly.')
            raise HTTPException(429, 'Destination research is busy. Please retry shortly.')
        task = asyncio.create_task(prepare(value.destination, key, uid, value.origin, value.startDate,
                                            resolved_choices if route_checkpoint else value.mapChoices, route_checkpoint))
        _tasks.add(task); task.add_done_callback(_tasks.discard)
    return await status(key, uid)

@router.get('/{key}')
async def status(key: str, uid: str = Depends(chat_user)):
    if not re.fullmatch(r'[a-f0-9]{24}', key): raise HTTPException(404, 'Itinerary not found.')
    row = await asyncio.to_thread(store.read, key)
    event(key, 'status_poll', row['status'] if row else 'missing')
    if not row: raise HTTPException(404, 'Itinerary not found.')
    if row['status'] == 'needs_user_choice':
        return {'id': key, 'status': 'needs_user_choice', 'message': row.get('error'), 'mapChoices': row.get('mapChoices'), 'stage': 'map_selection', 'modelCalls': row.get('modelCalls', 0)}
    if row['status'] == 'ready':
        value = await asyncio.to_thread(store.get_template, key)
        return {'id': key, 'status': 'ready', 'template': value.model_dump(), 'stage': 'complete', 'modelCalls': row.get('modelCalls', 0), 'warnings': value.warnings}
    import time
    if row['status'] == 'preparing' and row['lease'] < time.time():
        return {'id': key, 'status': 'failed', 'message': 'Preparation was interrupted. Retry to continue.'}
    return {'id': key, 'status': row['status'], 'message': row['error'], 'stage': row.get('stage'), 'modelCalls': row.get('modelCalls', 0)}

@router.post('/approach')
async def connect_origin(value: ApproachRequest, uid: str = Depends(chat_user)):
    template = await asyncio.to_thread(store.get_template, value.templateId, value.revision)
    # Precise origins are deliberately never written into shared template storage.
    try:
        with stage(value.templateId, 'connect_origin'):
            return await approach(template, value.origin)
    except HTTPException: raise
    except Exception:
        raise HTTPException(503, 'The road service could not connect your start. Your itinerary is kept; retry or edit the starting point.') from None


@router.post('/stage-route')
async def route_stage(value: StageRouteRequest, uid: str = Depends(chat_user)):
    template = await asyncio.to_thread(store.get_template, value.templateId, value.revision)
    try:
        with stage(value.templateId, 'stage_route'):
            return await stage_geometry(template, value.legId, value.optionId)
    except HTTPException: raise
    except Exception:
        raise HTTPException(503, 'The map route could not load. Your checkpoint overview is still available.') from None
