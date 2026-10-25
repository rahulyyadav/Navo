from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from datetime import date

class Point(BaseModel):
    model_config = ConfigDict(extra='forbid')

    @model_validator(mode='before')
    @classmethod
    def discard_catalogue_metadata(cls, value):
        # Older clients and cached plans may include search-only aliases. They
        # do not affect location identity or research. Keep other fields strict.
        if isinstance(value, dict) and 'aliases' in value:
            return {key: item for key, item in value.items() if key != 'aliases'}
        return value

    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=150)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    fullName: str | None = Field(default=None, max_length=300)
    region: str | None = Field(default=None, max_length=150)
    country: str | None = Field(default=None, max_length=100)
    placeType: str | None = Field(default=None, max_length=80)
    canonicalId: str | None = Field(default=None, max_length=120)
    destinationMeaning: str | None = Field(default=None, max_length=300)
    provider: Literal['catalogue', 'photon', 'coordinates', 'osm-reference'] | None = None
    providerId: str | None = Field(default=None, max_length=200)
    # True means this is a named planning checkpoint with schematic coordinates,
    # not a precise map match or turn-by-turn trail position.
    coordinatesApproximate: bool = False

class Source(BaseModel):
    id: str
    title: str = Field(max_length=300)
    url: str = Field(pattern=r'^https://', max_length=2000)
    checkedAt: str
    publishedAt: str | None = None

class Option(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    mode: Literal['taxi', 'bus', 'jeep', 'flight', 'walk']
    label: str = Field(min_length=1, max_length=120)
    minutes: int | None = Field(default=None, ge=1, le=20000)
    note: str = Field(default='', max_length=1000)
    sourceIds: list[str] = Field(min_length=1, max_length=10)
    verification: Literal['open-confirmed', 'closed-confirmed', 'unconfirmed'] = 'unconfirmed'
    verificationSourceIds: list[str] = Field(default_factory=list, max_length=5)
    requiresUserDecision: bool = False
    warning: str | None = Field(default=None, max_length=500)

class Leg(BaseModel):
    id: str
    start: Point
    end: Point
    options: list[Option] = Field(min_length=1, max_length=5)
    selected: str
    geometry: list[Point] = Field(default_factory=list, max_length=10000)
    geometryKind: Literal['schematic', 'road', 'trail'] = 'schematic'

    @model_validator(mode='after')
    def selected_option(self):
        if len({o.id for o in self.options}) != len(self.options):
            raise ValueError('duplicate_transport_option_ids')
        if self.selected not in {o.id for o in self.options}:
            raise ValueError('unknown_selected_transport_option')
        return self

class AgentReview(BaseModel):
    agent: Literal['Hank', 'Julia', 'Thompson', 'Paul']
    summary: str = Field(max_length=500)
    sourceIds: list[str] = Field(default_factory=list, max_length=20)
    legIds: list[str] = Field(default_factory=list, max_length=40)


class Template(BaseModel):
    version: Literal[1] = 1
    id: str
    destination: Point
    title: str = Field(max_length=180)
    destinationMeaning: str | None = Field(default=None, max_length=300)
    legs: list[Leg] = Field(min_length=1, max_length=40)
    sources: list[Source] = Field(min_length=1, max_length=20)
    researchedAt: str
    expiresAt: str
    provenance: Literal['curated', 'researched']
    readiness: Literal['ready', 'needs-user-choice', 'blocked'] = 'ready'
    warnings: list[str] = Field(default_factory=list, max_length=20)
    agentReview: list[AgentReview] = Field(default_factory=list, max_length=4)

    @model_validator(mode='after')
    def connected(self):
        if len({l.id for l in self.legs}) != len(self.legs):
            raise ValueError('Duplicate leg')
        known = {s.id for s in self.sources}
        for review in self.agentReview:
            if not set(review.sourceIds) <= known or not set(review.legIds) <= {leg.id for leg in self.legs}:
                raise ValueError('Review references an unknown source or stage')
        for index, leg in enumerate(self.legs):
            if index and leg.start != self.legs[index - 1].end:
                raise ValueError('Disconnected itinerary')
            if any(not set(o.sourceIds) <= known for o in leg.options):
                raise ValueError('Missing source')
            if any(not set(o.verificationSourceIds) <= known for o in leg.options):
                raise ValueError('Missing verification source')
        return self

class PrepareRequest(BaseModel):
    destination: Point
    origin: Point | None = None
    startDate: str | None = Field(default=None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    mapChoices: dict[str, str] = Field(default_factory=dict, max_length=20)

    @field_validator('startDate')
    @classmethod
    def real_start_date(cls, value):
        if value:
            try: date.fromisoformat(value)
            except ValueError: raise ValueError('Departure date must be a real calendar date.') from None
        return value

class ApproachRequest(BaseModel):
    templateId: str = Field(pattern=r'^[a-f0-9]{24}$')
    revision: str = Field(min_length=1, max_length=60)
    origin: Point

class StageRouteRequest(BaseModel):
    templateId: str = Field(pattern=r'^[a-f0-9]{24}$')
    revision: str = Field(min_length=1, max_length=60)
    legId: str = Field(min_length=1, max_length=100)
    optionId: str = Field(min_length=1, max_length=80)


class JourneyPreferences(BaseModel):
    model_config = ConfigDict(extra='forbid')
    origin: Point
    startDate: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    budget: str = Field(default='', max_length=12, pattern=r'^(?:\d{0,9}(?:\.\d{0,2})?)?$')
    currency: Literal['NPR'] = 'NPR'
    finishDate: str = Field(default='', max_length=10, pattern=r'^(?:\d{4}-\d{2}-\d{2})?$')

    @field_validator('startDate')
    @classmethod
    def real_start_date(cls, value):
        try: date.fromisoformat(value)
        except ValueError: raise ValueError('A real departure date is required.') from None
        return value

    @field_validator('finishDate')
    @classmethod
    def real_finish_date(cls, value):
        if value:
            try: date.fromisoformat(value)
            except ValueError: raise ValueError('Finishing date must be a real calendar date.') from None
        return value


class PersonalJourney(BaseModel):
    """Validated user-owned snapshot; callers cannot write arbitrary Firestore data."""
    model_config = ConfigDict(extra='forbid')
    version: Literal[1] = 1
    id: str = Field(pattern=r'^[a-f0-9]{24}$')
    template: Template
    preferences: JourneyPreferences
    approach: list[Leg] = Field(max_length=45)
    approachSources: list[Source] = Field(max_length=20)
    selections: dict[str, str] = Field(default_factory=dict)
    completed: int = Field(ge=0, le=100)
    phase: Literal['draft', 'ready', 'travelling', 'paused', 'completed']
    acceptedUnverified: list[str] = Field(default_factory=list, max_length=40)
    reviewAcknowledged: bool = False
    lastReviewedAt: str | None = None
    proposedRevision: dict | None = None
    createdAt: str
    updatedAt: str

    @model_validator(mode='after')
    def valid_personal_journey(self):
        if self.id == self.template.id:
            raise ValueError('Personal and shared itinerary identifiers must differ.')
        known = {leg.id for leg in [*self.approach, *self.template.legs]}
        if len(known) != len(self.approach) + len(self.template.legs):
            raise ValueError('Approach and itinerary stage identifiers must be unique.')
        if self.completed > len(known):
            raise ValueError('Journey progress exceeds the number of stages.')
        approach_sources = {source.id for source in self.approachSources}
        if any(not set(option.sourceIds) <= approach_sources for leg in self.approach for option in leg.options):
            raise ValueError('Approach options must cite their saved sources.')
        if self.phase == 'draft' and self.completed:
            raise ValueError('A draft journey cannot have travel progress.')
        accepted = set(self.acceptedUnverified)
        for leg in [*self.approach, *self.template.legs]:
            selected_id = self.selections.get(leg.id, leg.selected)
            option = next((item for item in leg.options if item.id == selected_id), None)
            if option is None:
                raise ValueError('Journey selection references an unknown option.')
            if self.phase == 'draft':
                continue
            if option.verification == 'closed-confirmed':
                raise ValueError('A closed route option cannot be selected.')
            if option.requiresUserDecision and option.verification == 'unconfirmed' and f'{leg.id}:{option.id}' not in accepted:
                raise ValueError('An unverified route choice requires explicit user acceptance.')
        return self


class JourneyLibrary(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: Literal[1] = 1
    activeId: str | None = None
    journeys: list[PersonalJourney] = Field(max_length=40)

    @model_validator(mode='after')
    def valid_library(self):
        ids = [journey.id for journey in self.journeys]
        if len(ids) != len(set(ids)) or self.activeId is not None and self.activeId not in ids:
            raise ValueError('Journey library identifiers are invalid.')
        return self


class JourneyRevisionChoice(BaseModel):
    model_config = ConfigDict(extra='forbid')
    decision: Literal['accept', 'reject']
    acceptedUnverified: list[str] = Field(default_factory=list, max_length=40)
