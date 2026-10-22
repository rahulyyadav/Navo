from functools import lru_cache
from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / '.env', extra='ignore')
    brevo_api_key: str = ''
    brevo_sender_email: str = ''
    brevo_sender_name: str = 'Navo'
    auth_otp_secret: str = ''
    auth_otp_store_path: str = str(Path(__file__).resolve().parents[1] / '.local' / 'email-otp.sqlite3')
    firebase_project_id: str = ''
    firebase_web_api_key: str = Field(default='', validation_alias=AliasChoices('FIREBASE_WEB_API_KEY', 'EXPO_PUBLIC_FIREBASE_API_KEY'))
    chat_budget_path: str = str(Path(__file__).resolve().parents[1] / '.local' / 'chat-budgets.sqlite3')
    journey_store_path: str = str(Path(__file__).resolve().parents[1] / '.local' / 'journeys.sqlite3')
    journey_search_key: str = ''
    journey_daily_research: int = Field(default=20, ge=0, le=1000)
    google_application_credentials: str = ''
    expo_access_token: str = ''
    maintenance_token: str = ''
    firebase_client_email: str = ''
    firebase_private_key: str = ''
    cors_origins: str = 'http://localhost:8081,http://localhost:8099,http://localhost:8113'
    nebius_api_key: str = ''
    nebius_base_url: str = 'https://api.tokenfactory.us-central1.nebius.com/v1'
    nebius_model: str = 'nvidia/nemotron-3-super-120b-a12b'
    openrouter_api_key: str = ''
    openrouter_model: str = 'nvidia/nemotron-3.5-super-vl:free'
    openrouter_daily_requests: int = Field(default=100, ge=0, le=10000)
    openrouter_user_daily_requests: int = Field(default=100, ge=0, le=1000)
    enable_demo: bool = False
    ai_enabled: bool = True
    ai_daily_requests: int = Field(default=100, ge=0, le=10000)
    ai_user_daily_requests: int = Field(default=100, ge=0, le=1000)

@lru_cache
def settings():
    return Settings()

# Official Token Factory endpoints; keep credentials away from arbitrary hosts.
TOKEN_FACTORY_BASES = frozenset({'https://api.tokenfactory.us-central1.nebius.com/v1', 'https://api.tokenfactory.nebius.com/v1'})

def token_factory_url_allowed(value: str) -> bool:
    return value.rstrip('/') in TOKEN_FACTORY_BASES
