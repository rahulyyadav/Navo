"""Bound request memory before JSON parsing and keep responses out of shared caches."""
from starlette.responses import JSONResponse

class RequestBoundary:
    def __init__(self, app, max_bytes=65536): self.app=app; self.max_bytes=max_bytes
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http': return await self.app(scope, receive, send)
        parts=[]; size=0
        while True:
            message=await receive()
            if message['type']=='http.disconnect': return
            part=message.get('body',b''); size+=len(part)
            if size > self.max_bytes:
                return await JSONResponse({'detail':'This request is too large.'},status_code=413)(scope,receive,send)
            parts.append(part)
            if not message.get('more_body',False): break
        delivered=False
        async def replay():
            nonlocal delivered
            if delivered: return await receive()
            delivered=True
            return {'type':'http.request','body':b''.join(parts),'more_body':False}
        async def secure_send(message):
            if message['type']=='http.response.start':
                message['headers']=[*message.get('headers',[]),(b'cache-control',b'no-store'),(b'x-content-type-options',b'nosniff')]
            await send(message)
        await self.app(scope,replay,secure_send)
