"""Bounded Token Factory transport. Secrets and raw provider errors never enter results."""
from dataclasses import dataclass
from time import perf_counter
import httpx
import asyncio
import logging
from fastapi import HTTPException
from .config import settings, token_factory_url_allowed
from .observability import waiting

MODEL_TOTAL_TIMEOUT = 130
PROVIDER_REQUEST_TIMEOUT = 60

@dataclass(frozen=True)
class Completion:
    content: str
    model: str
    elapsed_ms: int
    prompt_tokens: int | None
    completion_tokens: int | None
    provider: str = "nebius"

def configured():
    value = settings()
    return bool(value.nebius_api_key and 'nemotron' in value.nebius_model.lower()
                and token_factory_url_allowed(value.nebius_base_url))

def token_count(value):
    return value if type(value) is int and value >= 0 else None

async def complete(messages, schema, transport=None, *, provider="nebius", fallback_reserve=None,
                   timeout_seconds=None, enable_thinking=None):
    if timeout_seconds is None:
        timeout_seconds = MODEL_TOTAL_TIMEOUT
    config = settings()
    fallback = provider == 'openrouter'
    if fallback and not getattr(config, 'openrouter_api_key', ''):
        raise HTTPException(503, 'OpenRouter fallback is not configured.')
    if not fallback and not configured():
        raise HTTPException(503, 'Configure a Nebius key, exact NVIDIA Nemotron model ID and the Token Factory endpoint on the server.')
    model = config.openrouter_model if fallback else config.nebius_model
    endpoint = 'https://openrouter.ai/api/v1' if fallback else config.nebius_base_url.rstrip('/')
    api_key = config.openrouter_api_key if fallback else config.nebius_api_key
    logging.getLogger('uvicorn.error').info('AI provider=%s model=%s outcome=started', provider, model)
    started = perf_counter()
    deadline = started + max(0.05, timeout_seconds)

    async def use_fallback(reason, *, status=None):
        remaining = deadline - perf_counter()
        if fallback or not fallback_reserve or not getattr(config, 'openrouter_api_key', '') or remaining <= 0.05:
            return None
        if status is None:
            logging.getLogger('uvicorn.error').warning('AI provider=nebius outcome=fallback reason=%s next_provider=openrouter', reason)
        else:
            logging.getLogger('uvicorn.error').warning('AI provider=nebius outcome=fallback status=%s next_provider=openrouter', status)
        await asyncio.to_thread(fallback_reserve)
        remaining = deadline - perf_counter()
        if remaining <= 0.05:
            return None
        return await complete(messages, schema, transport, provider='openrouter', timeout_seconds=remaining)

    async def send():
        label = f'AI provider={provider} model={model}'
        payload = {'model': model, 'messages': messages, 'temperature': 0.2,
                   'max_tokens': 6000, 'response_format': {'type': 'json_schema',
                   'json_schema': {'name': 'trek_plan', 'schema': schema}}}
        if fallback:
            payload.update(provider={'require_parameters': True}, reasoning={'enabled': False})
        elif enable_thinking is not None:
            payload['chat_template_kwargs'] = {'enable_thinking': enable_thinking}
        remaining = max(0.05, deadline - perf_counter())
        async with waiting(label), httpx.AsyncClient(timeout=httpx.Timeout(min(PROVIDER_REQUEST_TIMEOUT, remaining), connect=min(15, remaining)), transport=transport) as client:
            async with client.stream('POST', f'{endpoint}/chat/completions',
                    headers={'Authorization': f'Bearer {api_key}', 'X-Title': 'Navo'}, json=payload) as response:
                logging.getLogger('uvicorn.error').info('%s outcome=headers upstream_status=%s elapsed_ms=%s', label, response.status_code, round((perf_counter() - started) * 1000))
                # Non-streaming JSON may arrive in chunks/keepalives. Count bytes,
                # never print provider output or reasoning. Bound the total body.
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 1000000:
                        raise HTTPException(502, 'The model response exceeded the allowed size.')
                logging.getLogger('uvicorn.error').info('%s outcome=body_received bytes=%s elapsed_ms=%s', label, len(body), round((perf_counter() - started) * 1000))
                return httpx.Response(response.status_code, content=bytes(body))
    try:
        response = await asyncio.wait_for(send(), timeout=max(0.05, deadline - perf_counter()))
        # A temporary overload can occur after several successful agent calls.
        # Prefer the configured fallback; otherwise retry once inside the same
        # absolute deadline. Authentication/schema failures are never retried.
        can_fallback = not fallback and fallback_reserve and getattr(config, 'openrouter_api_key', '')
        if response.status_code in (502, 503, 529) and not can_fallback and deadline - perf_counter() > 1.05:
            logging.getLogger('uvicorn.error').warning('AI provider=%s outcome=transient_retry upstream_status=%s', provider, response.status_code)
            await asyncio.sleep(1)
            response = await asyncio.wait_for(send(), timeout=max(0.05, deadline - perf_counter()))
    except TimeoutError:
        logging.getLogger('uvicorn.error').error('AI provider=%s outcome=total_timeout limit_seconds=%s', provider, round(timeout_seconds))
        replacement = await use_fallback('timeout')
        if replacement is not None:
            return replacement
        raise HTTPException(504, f'{provider} did not finish within {round(timeout_seconds)} seconds. Your answers are saved; try again later.') from None
    except httpx.TimeoutException:
        logging.getLogger('uvicorn.error').warning('AI provider=%s outcome=request_timeout', provider)
        replacement = await use_fallback('timeout')
        if replacement is not None:
            return replacement
        raise HTTPException(504, f'{provider} took too long. Please try again later.') from None
    except httpx.RequestError:
        logging.getLogger('uvicorn.error').warning('AI provider=%s outcome=request_error', provider)
        replacement = await use_fallback('connection_error')
        if replacement is not None:
            return replacement
        raise HTTPException(502, f'Could not reach {provider}. Please try again.') from None
    if response.status_code != 200:
        logging.getLogger('uvicorn.error').error('AI provider=%s model=%s outcome=rejected upstream_status=%s', provider, model, response.status_code)
    if fallback and response.status_code == 404:
        raise HTTPException(503, 'The selected OpenRouter model endpoint is unavailable. Try again later or configure another available model.')
    if (response.status_code in (402, 408, 425, 429) or 500 <= response.status_code < 600) and not fallback and fallback_reserve and getattr(config, 'openrouter_api_key', ''):
        replacement = await use_fallback('upstream_error', status=response.status_code)
        if replacement is not None:
            return replacement
    if response.status_code in (402, 408, 425, 429) or 500 <= response.status_code < 600:
        raise HTTPException(503, f'{provider} is temporarily unavailable or busy. Your preparation is saved; please try again shortly.')
    if response.status_code != 200:
        raise HTTPException(502, f'{provider} rejected the request. Check model access and structured-output support on the server.')
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
        model = data.get('model', model)
        if not isinstance(model, str) or len(model) > 200:
            raise ValueError()
        usage = data.get('usage') or {}
        if not isinstance(usage, dict):
            usage = {}
        logging.getLogger('uvicorn.error').info('AI provider=%s outcome=validated elapsed_ms=%s prompt_tokens=%s completion_tokens=%s', provider, round((perf_counter() - started) * 1000), token_count(usage.get('prompt_tokens')), token_count(usage.get('completion_tokens')))
        return Completion(content, model, round((perf_counter() - started) * 1000),
                          token_count(usage.get('prompt_tokens')), token_count(usage.get('completion_tokens')), provider)
    except (ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, 'Token Factory returned an incomplete response. Please retry.') from None
