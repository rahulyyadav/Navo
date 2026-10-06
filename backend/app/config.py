from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / '.env', extra='ignore')
    firebase_project_id: str = ''
    firebase_client_email: str = ''
    firebase_private_key: str = ''
    google_application_credentials: str = ''
    cors_origins: str = 'http://localhost:8081,http://localhost:8099'
    nebius_api_key: str = ''
    nebius_base_url: str = 'https://api.tokenfactory.us-central1.nebius.com/v1'
    nebius_model: str = 'nvidia/nemotron-3-super-120b-a12b'
    enable_demo: bool = False

@lru_cache
def settings():
    return Settings()
