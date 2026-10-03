from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    firebase_project_id: str = ''
    google_application_credentials: str = ''
    expo_access_token: str = ''
    firebase_client_email: str = ''
    firebase_private_key: str = ''
    cors_origins: str = 'http://localhost:8081,http://localhost:8099'
    nebius_api_key: str = ''
    nebius_base_url: str = 'https://api.tokenfactory.nebius.com/v1'
    nebius_model: str = ''
    enable_demo: bool = False

@lru_cache
def settings():
    return Settings()
