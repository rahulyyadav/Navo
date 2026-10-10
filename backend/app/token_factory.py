"""Bounded Token Factory transport. Secrets and raw provider errors never enter results."""
from dataclasses import dataclass
from time import perf_counter
import httpx
from fastapi import HTTPException
from .config import settings, token_factory_url_allowed

@dataclass(frozen=True)
class Completion:
    content: str
    model: str
    elapsed_ms: int
    prompt_tokens: int | None
    completion_tokens: int | None

def configured():
    value = settings()
    return bool(value.nebius_api_key and 'nemotron' in value.nebius_model.lower()
                and token_factory_url_allowed(value.nebius_base_url))

def token_count(value):
    return value if type(value) is int and value >= 0 else None

async def complete(messages, schema, transport=None):
    config = settings()
    if not configured():
        raise HTTPException(503, 'Configure a Nebius key, exact NVIDIA Nemotron model ID and the Token Factory endpoint on the server.')
    started = perf_counter()
    try:
        async with httpx.AsyncClient(timeout=65, transport=transport) as client:
            response = await client.post(
                f'{config.nebius_base_url.rstrip("/")}/chat/completions',
                headers={'Authorization': f'Bearer {config.nebius_api_key}'},
                json={'model': config.nebius_model, 'messages': messages, 'temperature': 0.2,
                      'max_tokens': 6000, 'response_format': {'type': 'json_schema',
                      'json_schema': {'name': 'trek_plan', 'schema': schema}}})
    except httpx.TimeoutException:
        raise HTTPException(504, 'Nemotron took too long. Retry with a shorter trip or try again later.') from None
    except httpx.RequestError:
        raise HTTPException(502, 'Could not reach Token Factory. Please try again.') from None
    if response.status_code == 429:
        raise HTTPException(503, 'Token Factory is busy or its quota is reached. Please try again later.')
    if response.status_code != 200:
        raise HTTPException(502, 'Token Factory rejected the request. Check model access and structured-output support on the server.')
    try:
        data = response.json()
        choice = data['choices'][0]
        message = choice['message']
        if message.get('refusal'):
            raise HTTPException(422, 'The model declined this request. Adjust your trip constraints.')
        if choice.get('finish_reason') == 'length':
            raise HTTPException(502, 'The model response was cut short. Try fewer days.')
        content = message['content']
        if not isinstance(content, str) or not content.strip() or len(content) > 100000:
            raise ValueError()
        model = data.get('model', config.nebius_model)
        if not isinstance(model, str) or len(model) > 200:
            raise ValueError()
        usage = data.get('usage') or {}
        if not isinstance(usage, dict):
            usage = {}
        return Completion(content, model, round((perf_counter() - started) * 1000),
                          token_count(usage.get('prompt_tokens')), token_count(usage.get('completion_tokens')))
    except (ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, 'Token Factory returned an incomplete response. Please retry.') from None
