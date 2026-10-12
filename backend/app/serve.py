"""Container entrypoint for hosts that assign PORT (Cloud Run and Render)."""
import os
import uvicorn

def port():
    value = int(os.environ.get('PORT', '8000'))
    if not 1 <= value <= 65535:
        raise ValueError('PORT must be between 1 and 65535.')
    return value

if __name__ == '__main__':
    uvicorn.run('app.main:app', host='0.0.0.0', port=port(), access_log=False)
