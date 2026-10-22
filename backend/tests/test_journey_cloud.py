import pytest
from types import SimpleNamespace
from fastapi import HTTPException
from app.journeys.cloud import _validate_savable
from app.journeys import store
from app.journeys.models import JourneyPreferences, Leg, Option, PersonalJourney, Point, Source, Template


def journey(*, accepted=None, verification='unconfirmed', phase='ready'):
    source = Source(id='guide', title='Trek guide', url='https://example.com/guide', checkedAt='2026-10-21T00:00:00+00:00')
    city = Point(id='city', name='Pokhara', latitude=28.2, longitude=83.9)
    peak = Point(id='peak', name='Mardi High Camp', latitude=28.48, longitude=83.94)
    option = Option(id='walk', mode='walk', label='Trek', minutes=None, note='', sourceIds=['guide'],
                    verification=verification, requiresUserDecision=verification == 'unconfirmed')
    leg = Leg(id='stage-1', start=city, end=peak, options=[option], selected='walk')
    template = Template(id='a' * 24, destination=peak, title='Mardi Himal', legs=[leg], sources=[source],
                        researchedAt='2026-10-21T00:00:00+00:00', expiresAt='2026-10-28T00:00:00+00:00',
                        provenance='researched', readiness='needs-user-choice')
    return PersonalJourney(version=1, id='b' * 24, template=template,
        preferences=JourneyPreferences(origin=city, startDate='2026-10-28', budget='', currency='NPR'),
        approach=[], approachSources=[], selections={}, acceptedUnverified=accepted or [], completed=0,
        phase=phase, createdAt='2026-10-21T00:00:00+00:00', updatedAt='2026-10-21T00:00:00+00:00')


def test_unverified_option_requires_explicit_user_choice():
    value = journey(accepted=['stage-1:walk'])
    value.acceptedUnverified = []
    with pytest.raises(HTTPException) as error:
        _validate_savable(value)
    assert error.value.status_code == 409
    value = journey(accepted=['stage-1:walk'])
    _validate_savable(value)


def test_confirmed_closed_option_is_never_saved_as_selected():
    value = journey(verification='open-confirmed')
    value.template.legs[0].options[0].verification = 'closed-confirmed'
    with pytest.raises(HTTPException) as error:
        _validate_savable(value)
    assert error.value.status_code == 409


def test_destination_context_changes_research_cache_key():
    approximate = Point(id='catalog:mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94,
                       fullName='Mardi Himal Trek, Nepal', country='Nepal', placeType='trek destination')
    mapped = approximate.model_copy(update={'fullName': 'Mardi Himal High Camp, Kaski, Nepal', 'region': 'Kaski', 'placeType': 'camp'})
    assert store.destination_key(approximate) != store.destination_key(mapped)


def test_canonical_destination_identity_survives_endpoint_coordinate_refresh():
    original = Point(id='catalog:abc', canonicalId='annapurna-base-camp', name='Annapurna Base Camp', latitude=28.674, longitude=83.877)
    refreshed = original.model_copy(update={'latitude': 28.675, 'longitude': 83.878})
    assert store.destination_key(original) == store.destination_key(refreshed)


def test_failed_source_search_returns_its_daily_research_slot(monkeypatch, tmp_path):
    monkeypatch.setattr(store, 'settings', lambda: SimpleNamespace(
        journey_store_path=str(tmp_path / 'journeys.sqlite3'), journey_daily_research=1))
    store.reserve_research()
    store.release_research()
    store.reserve_research()


@pytest.mark.parametrize('readiness', ['ready', 'needs-user-choice', 'blocked'])
@pytest.mark.parametrize('verification', ['unconfirmed', 'closed-confirmed'])
def test_draft_route_can_be_saved_with_pending_warnings(readiness, verification):
    value = journey(phase='draft', verification=verification)
    value.template.readiness = readiness
    _validate_savable(value)
    assert value.acceptedUnverified == []
    assert value.template.legs[0].options[0].verification == verification
    restored = PersonalJourney.model_validate(value.model_dump())
    assert restored.phase == 'draft'


def test_general_review_warning_can_be_acknowledged_after_viewing_route():
    value = journey(phase='draft', verification='open-confirmed')
    _validate_savable(value)
    value.phase = 'travelling'
    with pytest.raises(HTTPException, match='Review the route notes'):
        _validate_savable(value)
    value.reviewAcknowledged = True
    _validate_savable(value)


def test_viewing_draft_does_not_allow_starting_on_a_reported_closed_option():
    from pydantic import ValidationError
    value = journey(phase='draft', verification='closed-confirmed')
    with pytest.raises(ValidationError, match='closed route option'):
        PersonalJourney.model_validate({**value.model_dump(), 'phase': 'travelling', 'reviewAcknowledged': True})


def test_draft_keeps_transport_selection_validation():
    from pydantic import ValidationError
    value = journey(phase='draft')
    with pytest.raises(ValidationError, match='unknown option'):
        PersonalJourney.model_validate({**value.model_dump(), 'selections': {'stage-1': 'unknown'}})
