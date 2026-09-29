from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)

class GroupCreate(Model):
    name: str = Field(min_length=2, max_length=60)
    trekId: str = Field(min_length=1, max_length=80, pattern=r'^[a-z0-9-]+$')
    startDate: date
    requestId: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,80}$')

class InvitationCreate(Model):
    email: str = Field(min_length=5, max_length=254, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

class InvitationResponse(Model):
    decision: Literal['accepted', 'declined', 'revoked']

class TextMessage(Model):
    text: str = Field(min_length=1, max_length=2000)
    requestId: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,80}$')

class Position(Model):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float = Field(ge=0, le=100000)
    capturedAt: str = Field(max_length=40)

class AlertCreate(Model):
    kind: Literal['test', 'sos', 'check-in', 'off-route', 'weather']
    message: str = Field(default='', max_length=500)
    position: Position | None = None
    requestId: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,80}$')
    confirmed: bool = False

class AlertAction(Model):
    action: Literal['acknowledge', 'resolve']

class Contact(Model):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r'^\+?[0-9 ()-]{7,25}$')
    relationship: str = Field(default='', max_length=60)

class Onboarding(Model):
    completed: bool = False
    fullName: str = Field(min_length=2, max_length=100)
    level: Literal['first-timer', 'day-hiker', 'seasoned', 'high-altitude'] | None = None
    goals: list[str] = Field(default_factory=list, max_length=12)
    emergencyContact: Contact | None = None
    alertsEnabled: bool = False
    completedAt: str | None = None

class DeviceToken(Model):
    token: str = Field(pattern=r'^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$', max_length=200)
    platform: Literal['ios', 'android']

class PlanRequest(Model):
    trekId: str = Field(pattern=r'^[a-z0-9-]+$')
    days: int = Field(ge=2, le=30)
    experience: Literal['first-timer', 'day-hiker', 'seasoned', 'high-altitude']
    goals: str = Field(default='', max_length=500)
    maxDailyAscent: int = Field(default=800, ge=200, le=1200)
    maxDailyDistance: float = Field(default=15, ge=3, le=25)
    requestId: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,80}$')
    demonstrateRepair: bool = False

class PlanDay(Model):
    day: int = Field(ge=1, le=30)
    start: str = Field(min_length=1, max_length=100)
    end: str = Field(min_length=1, max_length=100)
    distanceKm: float = Field(ge=0, le=100)
    ascentM: int = Field(ge=0, le=5000)
    sleepingElevationM: int = Field(ge=0, le=7000)
    rest: bool
    notes: str = Field(max_length=1000)

class Itinerary(Model):
    title: str = Field(min_length=1, max_length=120)
    days: list[PlanDay] = Field(min_length=2, max_length=30)
    explanation: str = Field(max_length=2000)
    emergencyNotes: str = Field(min_length=10, max_length=1000)
