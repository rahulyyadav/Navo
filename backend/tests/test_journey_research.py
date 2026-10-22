import asyncio
import importlib
import json
import httpx
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app.journeys.models import Point

research = importlib.import_module('app.journeys.research')


def packet(statuses, *, closure=False, published_at='2026-10-01'):
    calls = []
    prompts = []
    gateway = {'name': 'Pokhara', 'placeQuery': 'Pokhara, Nepal'}
    peak = {'name': 'Mardi Himal High Camp', 'placeQuery': 'Mardi Himal High Camp, Nepal'}
    option = {'id': 'walk', 'mode': 'walk', 'label': 'Trek', 'minutes': None, 'note': 'Source-backed hiking stage.', 'sourceIds': ['hank-0']}
    draft = {'title': 'Mardi Himal route', 'gateway': gateway, 'segments': [
        {'destination': peak, 'options': [option]},
        {'destination': gateway, 'options': [option]},
    ]}
    async def search(*args, **kwargs):
        return [(f'https://example.com/{i}', f'Reference {i}') for i in range(3)]
    async def page(client, url):
        return SimpleNamespace(parts=['Public travel evidence. ' * 30], published_at=published_at), url
    async def complete(messages, schema, **kwargs):
        prompts.extend(messages)
        role = messages[0]['content']
        calls.append(role)
        if 'You are Hank,' in role:
            value = {'gateway': 'Pokhara', 'gatewayQuery': 'Pokhara Nepal', 'gatewaySourceIds': ['hank-0'], 'claims': [], 'destinationMeaning': 'Mardi Himal High Camp', 'destinationMeaningSourceIds': ['hank-0']}
        elif 'You are Julia,' in role:
            value = draft
        elif 'You are Thompson,' in role:
            attempt = len([v for v in calls if 'You are Thompson,' in v])
            current = statuses[attempt - 1]
            value = {'findings': [{'legIndex': i, 'status': current, 'sourceIds': [f'thompson-{attempt}-0'] if current != 'unconfirmed' else [], 'warning': 'Current status unclear.' if current == 'unconfirmed' else '', 'credibleDisruption': current == 'unconfirmed' and closure} for i in range(2)]}
        else:
            value = {'decision': 'ready', 'issues': []}
        return SimpleNamespace(content=json.dumps(value), provider='openrouter', model='test-model', prompt_tokens=10, completion_tokens=10)
    async def geocode(client, stop, destination, index, choices=None, *, allow_unmapped=False):
        if index == 1: return destination
        return Point(id='pokhara', name='Pokhara', latitude=28.2, longitude=83.9)
    return calls, prompts, search, page, complete, geocode


@pytest.mark.parametrize('closed,expected_calls', [(False, 4), (True, 6)])
def test_evidence_team_is_bounded_and_revises_only_once(monkeypatch, closed, expected_calls):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94, destinationMeaning='Mardi Himal Base Camp endpoint')
    statuses = ['closed-confirmed', 'open-confirmed'] if closed else ['unconfirmed']
    calls, prompts, search, page, complete, geocode = packet(statuses, closure=closed)
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', complete)
    monkeypatch.setattr(research, 'geocode', geocode)
    result = asyncio.run(research.research(destination, 'a' * 24, provider='openrouter'))
    assert len(calls) == expected_calls
    assert sum('Julia' in role for role in calls) == (2 if closed else 1)
    assert result.readiness == ('ready' if closed else 'ready')
    assert result.legs[0].options[0].verification == ('open-confirmed' if closed else 'unconfirmed')
    assert result.destinationMeaning == 'Mardi Himal Base Camp endpoint'
    assert all(source.publishedAt == '2026-10-01' for source in result.sources)
    serialized_prompts = json.dumps(prompts)
    assert '28.48' not in serialized_prompts and '83.94' not in serialized_prompts


@pytest.mark.parametrize('duplicate_option_ids', [False, True])
def test_map_choice_resume_reuses_saved_route_without_recalling_hank_or_julia(monkeypatch, duplicate_option_ids):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    calls, _, search, page, complete, geocode = packet(['unconfirmed'])
    source = {'id': 'hank-0', 'title': 'Travel reference', 'url': 'https://example.com/route',
              'checkedAt': '2026-10-21T00:00:00+00:00', 'publishedAt': '2026-10-20'}
    option = {'id': 'walk', 'mode': 'walk', 'label': 'Trek', 'minutes': None,
              'note': 'Source-backed hiking stage.', 'sourceIds': ['hank-0']}
    gateway = {'name': 'Pokhara', 'placeQuery': 'Pokhara, Nepal'}
    peak = {'name': 'Mardi Himal High Camp', 'placeQuery': 'Mardi Himal High Camp, Nepal'}
    route_checkpoint = {
        'sources': [source],
        'evidence': [{'id': 'hank-0', 'title': source['title'], 'url': source['url'],
                     'checkedAt': source['checkedAt'], 'publishedAt': source['publishedAt'],
                     'text': 'Public travel evidence. ' * 30}],
        'hank': {'gateway': 'Pokhara', 'gatewayQuery': 'Pokhara Nepal', 'gatewaySourceIds': ['hank-0'],
                 'claims': [], 'destinationMeaning': 'Mardi Himal High Camp',
                 'destinationMeaningSourceIds': ['hank-0']},
        'draft': {'title': 'Mardi Himal route', 'gateway': gateway, 'segments': [
            {'destination': peak, 'options': [option]}, {'destination': gateway, 'options': [option]},
        ]},
    }
    if duplicate_option_ids:
        for segment in route_checkpoint['draft']['segments']:
            segment['options'].append({**option, 'label': 'Alternative walking stage', 'minutes': 90})
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', complete)
    monkeypatch.setattr(research, 'geocode', geocode)
    saved = []
    result = asyncio.run(research.research(destination, 'a' * 24, provider='openrouter',
        route_checkpoint=route_checkpoint, save_route_checkpoint=saved.append))
    assert len(result.legs) == 2
    assert len(calls) == 2
    assert all('You are Hank,' not in call and 'You are Julia,' not in call for call in calls)
    # The complete route checkpoint is already durable; no new checkpoint is needed.
    assert saved == []
    for leg in result.legs:
        assert len(leg.options) == (2 if duplicate_option_ids else 1)
        assert len({option.id for option in leg.options}) == len(leg.options)
        assert leg.selected == leg.options[0].id


@pytest.mark.parametrize('has_hank_result', [False, True])
def test_partial_checkpoint_resumes_at_first_missing_agent(monkeypatch, has_hank_result):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    calls, _, search, page, complete, geocode = packet(['unconfirmed'])
    source = {'id': 'hank-0', 'title': 'Travel reference', 'url': 'https://example.com/route',
              'checkedAt': '2026-10-21T00:00:00+00:00', 'publishedAt': '2026-10-20'}
    route_checkpoint = {
        'sources': [source],
        'evidence': [{'id': 'hank-0', 'title': source['title'], 'url': source['url'],
                     'checkedAt': source['checkedAt'], 'publishedAt': source['publishedAt'],
                     'text': 'Public travel evidence. ' * 30}],
    }
    if has_hank_result:
        route_checkpoint['hank'] = {'gateway': 'Pokhara', 'gatewayQuery': 'Pokhara Nepal', 'gatewaySourceIds': ['hank-0'],
                 'claims': [], 'destinationMeaning': 'Mardi Himal High Camp',
                 'destinationMeaningSourceIds': ['hank-0']}
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', complete)
    monkeypatch.setattr(research, 'geocode', geocode)
    saved = []
    result = asyncio.run(research.research(destination, 'c' * 24, provider='openrouter',
        route_checkpoint=route_checkpoint, save_route_checkpoint=saved.append))
    assert len(result.legs) == 2
    assert len(calls) == (3 if has_hank_result else 4)
    assert ('You are Hank,' not in calls) if has_hank_result else ('You are Hank,' in calls[0])
    assert 'draft' in saved[-1] and len(saved[-1]['draft']['segments']) == 2


def test_bad_source_references_are_rejected(monkeypatch):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    calls, prompts, search, page, complete, geocode = packet(['open-confirmed'])
    async def invalid(messages, schema, **kwargs):
        if 'You are Hank,' in messages[0]['content']:
            value = {'gateway': 'Pokhara', 'gatewayQuery': 'Pokhara Nepal', 'gatewaySourceIds': ['hank-0'], 'claims': [{'segment': 'gateway', 'claim': 'unsupported', 'sourceIds': ['missing']}], 'destinationMeaning': 'High Camp', 'destinationMeaningSourceIds': ['hank-0']}
            return SimpleNamespace(content=json.dumps(value), provider='openrouter', model='test-model', prompt_tokens=1, completion_tokens=1)
        return await complete(messages, schema, **kwargs)
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', invalid)
    monkeypatch.setattr(research, 'geocode', geocode)
    with pytest.raises(HTTPException) as raised:
        asyncio.run(research.research(destination, 'a' * 24, provider='openrouter'))
    assert raised.value.status_code == 502
    assert len(calls) == 0


def test_thompson_cannot_confirm_access_from_undated_or_stale_sources(monkeypatch):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    stale_date = (datetime.now(timezone.utc).date() - timedelta(days=60)).isoformat()
    calls, prompts, search, page, complete, geocode = packet(['open-confirmed'], published_at=stale_date)
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', complete)
    monkeypatch.setattr(research, 'geocode', geocode)
    result = asyncio.run(research.research(destination, 'a' * 24, provider='openrouter'))
    assert result.legs[0].options[0].verification == 'unconfirmed'
    assert 'published within the last 30 days' in result.legs[0].options[0].warning


def test_ambiguous_map_candidates_require_user_selection_and_use_navo_ids():
    class Response:
        def raise_for_status(self):
            return None
        def json(self):
            return {'features': [
                {'geometry': {'coordinates': [83.94, 28.20]}, 'properties': {'name': 'Pokhara', 'type': 'city', 'country': 'Nepal'}},
                {'geometry': {'coordinates': [84.04, 28.20]}, 'properties': {'name': 'Pokhara', 'type': 'village', 'country': 'Nepal'}},
            ]}
    class Client:
        async def get(self, *args, **kwargs):
            return Response()
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.2, longitude=83.99)
    stop = research.ResearchStop(name='Pokhara', placeQuery='Pokhara, Nepal')
    with pytest.raises(HTTPException) as raised:
        asyncio.run(research.geocode(Client(), stop, destination, 0))
    assert raised.value.status_code == 409
    choices = raised.value.detail['candidates']
    assert len(choices) == 2
    assert all(item['id'].startswith('navo:') for item in choices)
    selected = asyncio.run(research.geocode(Client(), stop, destination, 0, {'0': choices[1]['id']}))
    assert selected.latitude == choices[1]['latitude']
    assert selected.longitude == choices[1]['longitude']


def test_checkpoint_candidates_reject_unrelated_places_before_ambiguity_scoring():
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {'features': [
                {'geometry': {'coordinates': [83.84, 28.22]}, 'properties': {'name': 'Little Bells Promiseland Home Kaski', 'type': 'house', 'state': 'Gandaki'}},
                {'geometry': {'coordinates': [83.84, 28.22]}, 'properties': {'name': 'Kande-Australian Camp', 'type': 'shelter', 'state': 'Gandaki'}},
                {'geometry': {'coordinates': [83.86, 28.24]}, 'properties': {'name': 'Kande', 'type': 'village', 'state': 'Gandaki'}},
            ]}

    class Client:
        async def get(self, *args, **kwargs):
            return Response()

    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.3, longitude=83.9)
    stop = research.ResearchStop(name='Kande', placeQuery='Kande, Kaski, Nepal')
    with pytest.raises(HTTPException) as raised:
        asyncio.run(research.geocode(Client(), stop, destination, 1))
    assert raised.value.status_code == 409
    candidates = raised.value.detail['candidates']
    assert all('Little Bells' not in candidate['name'] for candidate in candidates)
    assert all('Kande' in candidate['name'] for candidate in candidates)


def test_persisted_map_choice_survives_photon_result_changes():
    class Client:
        async def get(self, *args, **kwargs):
            pytest.fail('A saved route checkpoint must not depend on refreshed Photon ordering')
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.2, longitude=83.99)
    stop = research.ResearchStop(name='Pokhara', placeQuery='Pokhara, Kaski, Nepal')
    name, latitude, longitude = 'Pokhara', 28.2096, 83.9856
    stable_id = f"navo:{research.hashlib.sha256(f'{name.casefold()}|{round(latitude,4)}|{round(longitude,4)}'.encode()).hexdigest()[:24]}"
    choice = {'id': stable_id, 'name': name, 'latitude': latitude, 'longitude': longitude,
              'stopName': stop.name, 'placeQuery': stop.placeQuery}
    selected = asyncio.run(research.geocode(Client(), stop, destination, 0, {'0': choice}))
    assert selected.id == stable_id
    assert selected.latitude == latitude


def test_stale_photon_id_returns_fresh_choice_instead_of_expired_error():
    class Response:
        def raise_for_status(self): return None
        def json(self):
            return {'features': [
                {'geometry': {'coordinates': [83.94, 28.20]}, 'properties': {'name': 'Pokhara', 'type': 'city', 'country': 'Nepal'}},
                {'geometry': {'coordinates': [84.04, 28.20]}, 'properties': {'name': 'Pokhara', 'type': 'village', 'country': 'Nepal'}},
            ]}
    class Client:
        async def get(self, *args, **kwargs): return Response()
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.2, longitude=83.99)
    stop = research.ResearchStop(name='Pokhara', placeQuery='Pokhara, Nepal')
    with pytest.raises(HTTPException) as raised:
        asyncio.run(research.geocode(Client(), stop, destination, 0, {'0': 'navo:stale'}))
    assert raised.value.status_code == 409
    assert raised.value.detail['type'] == 'map_choice_required'
    assert raised.value.detail['placeQuery'] == stop.placeQuery


def test_map_transport_timeout_is_retryable_not_misreported_as_missing_checkpoint():
    class Client:
        async def get(self, *args, **kwargs):
            request = httpx.Request('GET', 'https://photon.komoot.io/api/')
            raise httpx.ReadTimeout('private timeout', request=request)
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    stop = research.ResearchStop(name='Kande', placeQuery='Kande, Nepal')
    with pytest.raises(HTTPException) as raised:
        asyncio.run(research.geocode(Client(), stop, destination, 1, allow_unmapped=True))
    assert raised.value.status_code == 503
    assert 'research is saved' in raised.value.detail


def test_intermediate_map_miss_is_skipped_with_an_explicit_unverified_connection():
    source_option = research.Option(id='jeep', mode='jeep', label='Jeep', sourceIds=['hank-0'])
    gateway = research.ResearchStop(name='Pokhara', placeQuery='Pokhara, Nepal')
    kande = research.ResearchStop(name='Kande', placeQuery='Kande, Nepal')
    forest = research.ResearchStop(name='Forest Camp', placeQuery='Forest Camp, Nepal')
    high_camp = research.ResearchStop(name='Mardi Himal High Camp', placeQuery='Mardi Himal High Camp, Nepal')
    draft = research.RouteDraft(title='Mardi route', gateway=gateway, segments=[
        research.ResearchSegment(destination=kande, options=[source_option]),
        research.ResearchSegment(destination=forest, options=[source_option]),
        research.ResearchSegment(destination=high_camp, options=[source_option]),
        research.ResearchSegment(destination=gateway, options=[source_option]),
    ])
    stops = [gateway, kande, forest, high_camp, gateway]
    points = [
        Point(id='pokhara', name='Pokhara', latitude=28.2, longitude=83.9),
        None,
        Point(id='forest', name='Forest Camp', latitude=28.35, longitude=83.95),
        Point(id='high-camp', name='Mardi Himal High Camp', latitude=28.48, longitude=83.94),
        Point(id='pokhara', name='Pokhara', latitude=28.2, longitude=83.9),
    ]
    legs, warnings, gap_ids = research.build_mapped_legs(draft, stops, points, 'test')
    assert len(legs) == 3
    assert legs[0].start.name == 'Pokhara' and legs[0].end.name == 'Forest Camp'
    assert legs[0].id in gap_ids
    assert legs[0].options[0].verification == 'unconfirmed'
    assert legs[0].options[0].requiresUserDecision is True
    assert 'Kande' in warnings[0]
    assert 'Kande' in legs[0].options[0].warning


def test_research_uses_schematic_intermediate_checkpoints_without_map_lookup(monkeypatch):
    destination = Point(id='mardi', name='Mardi Himal Trek', latitude=28.48, longitude=83.94)
    calls, _, search, page, complete, _ = packet(['unconfirmed'])
    option = {'id': 'jeep', 'mode': 'jeep', 'label': 'Jeep', 'minutes': None,
              'note': 'Source-backed transport claim.', 'sourceIds': ['hank-0']}
    gateway = {'name': 'Pokhara', 'placeQuery': 'Pokhara, Nepal'}
    draft = {'title': 'Mardi route', 'gateway': gateway, 'segments': [
        {'destination': {'name': 'Kande', 'placeQuery': 'Kande, Nepal'}, 'options': [option]},
        {'destination': {'name': 'Forest Camp', 'placeQuery': 'Forest Camp, Nepal'}, 'options': [option]},
        {'destination': {'name': 'Mardi Himal High Camp', 'placeQuery': 'Mardi Himal High Camp, Nepal'}, 'options': [option]},
        {'destination': gateway, 'options': [option]},
    ]}
    async def route_complete(messages, schema, **kwargs):
        if 'You are Julia,' in messages[0]['content']:
            return SimpleNamespace(content=json.dumps(draft), provider='openrouter', model='test-model', prompt_tokens=1, completion_tokens=1)
        return await complete(messages, schema, **kwargs)
    async def geocode(client, stop, _destination, index, choices=None, *, allow_unmapped=False):
        raise AssertionError(f'Route checkpoint {stop.name} should not be sent to map search')
    monkeypatch.setattr(research, 'search', search)
    monkeypatch.setattr(research, 'page', page)
    monkeypatch.setattr(research, 'complete', route_complete)
    monkeypatch.setattr(research, 'geocode', geocode)
    result = asyncio.run(research.research(destination, 'b' * 24, provider='openrouter'))
    assert len(result.legs) == 4
    assert result.legs[0].end.name == 'Kande'
    assert result.legs[0].end.coordinatesApproximate is True
    assert result.readiness == 'ready'
    assert any('Kande' in warning for warning in result.warnings)


def test_search_tries_lite_results_when_standard_duckduckgo_markup_is_empty(monkeypatch):
    monkeypatch.setattr(research, 'settings', lambda: SimpleNamespace(journey_search_key=''))
    class Response:
        def __init__(self, text=''):
            self.text = text
        def raise_for_status(self):
            return None
    class Client:
        def __init__(self):
            self.calls = []
        async def get(self, url, **kwargs):
            self.calls.append(url)
            if 'lite.duckduckgo.com' in url:
                return Response('<a class="result-link" href="https://tourism.gov.np/notice">Official notice</a>')
            return Response('<html><body>Search unavailable</body></html>')
    client = Client()
    result = asyncio.run(research.search(client, 'Mardi Himal access notice'))
    assert result == [('https://tourism.gov.np/notice', 'Official notice')]
    assert client.calls == ['https://html.duckduckgo.com/html/', 'https://lite.duckduckgo.com/lite/']


def test_destination_search_uses_short_destination_specific_queries():
    destination = research.Point(id='photon:way:1', name='Mardi Himal', latitude=28.48, longitude=83.94,
                                 fullName='Mardi Himal, Kaski, Nepal', region='Kaski', country='Nepal', placeType='peak')
    origin = research.Point(id='photon:node:2', name='Kathmandu', latitude=27.7, longitude=85.3,
                            fullName='Kathmandu, Nepal', region='Bagmati', country='Nepal', placeType='city')
    queries = research.destination_search_queries(destination, origin)
    assert queries == [
        'Kathmandu, Nepal Bagmati to Mardi Himal, Kaski, Nepal transport route',
        'Mardi Himal, Kaski, Nepal trek route',
        'Mardi Himal, Kaski, Nepal trailhead gateway transport',
    ]
    assert all(len(query) < 150 for query in queries)
    assert 'closure' in research.destination_search_queries(destination, purpose='disruptions')[0]
    approximate = destination.model_copy(update={'fullName': 'Mardi Himal, Kaski, Nepal · approximate planning point'})
    assert 'approximate planning point' not in ' '.join(research.destination_search_queries(approximate)).casefold()


def test_search_logs_transport_failures_separately_from_empty_results(monkeypatch):
    monkeypatch.setattr(research, 'settings', lambda: SimpleNamespace(journey_search_key=''))
    events = []
    monkeypatch.setattr(research, 'event', lambda key, stage, outcome, **fields: events.append((stage, outcome, fields)))
    class Client:
        async def get(self, *args, **kwargs):
            raise research.httpx.ConnectError('offline')
    result = asyncio.run(research.search(Client(), 'Mardi Himal Nepal route', journey_key='a' * 24))
    assert result == []
    assert [(stage, outcome) for stage, outcome, _ in events] == [
        ('search_provider', 'request_error'),
        ('search_provider', 'request_error'),
        ('search_provider', 'request_error'),
    ]
    assert all(fields['error_type'] == 'ConnectError' for _, _, fields in events)


def test_search_redirects_stay_within_provider_domain(monkeypatch):
    async def public_url(url):
        return url
    monkeypatch.setattr(research, 'public_url', public_url)
    class Response:
        def __init__(self, url, *, redirect=False):
            self.url = url
            self.is_redirect = redirect
            self.headers = {'location': 'https://duckduckgo.com/final'} if redirect else {}
    class Client:
        def __init__(self): self.urls = []
        async def get(self, url, **kwargs):
            self.urls.append(url)
            return Response(url, redirect=len(self.urls) == 1)
    client = Client()
    response = asyncio.run(research.search_request(client, 'https://html.duckduckgo.com/html/', params={'q': 'trail'}, allowed_domains=('duckduckgo.com',)))
    assert response.url == 'https://duckduckgo.com/final'
    assert client.urls == ['https://html.duckduckgo.com/html/', 'https://duckduckgo.com/final']

    class UnsafeClient:
        async def get(self, url, **kwargs):
            return SimpleNamespace(is_redirect=True, headers={'location': 'https://example.com/redirect'}, url=url)
    with pytest.raises(ValueError, match='outside its trusted domain'):
        asyncio.run(research.search_request(UnsafeClient(), 'https://html.duckduckgo.com/html/', allowed_domains=('duckduckgo.com',)))


def test_transport_identifiers_are_local_and_preserve_distinct_researched_options():
    first = research.Option(id='bus', mode='bus', label='Tourist bus', minutes=420,
        sourceIds=['hank-0'], verification='unconfirmed', requiresUserDecision=True,
        warning='Confirm departure locally.')
    second = first.model_copy(update={'label': 'Local bus', 'minutes': 480})
    repeated = first.model_copy(update={'id': 'other-id'})
    options = research.journey_options([first, second, repeated])
    assert len(options) == 2
    assert len({option.id for option in options}) == 2
    assert [option.minutes for option in options] == [420, 480]
    for original, converted in zip([first, second], options):
        assert original.model_dump(exclude={'id'}) == converted.model_dump(exclude={'id'})
    assert first.id == second.id == 'bus', 'conversion must not mutate a saved draft'
    assert research.journey_options([first, second, repeated]) == options


def test_twelve_segment_route_with_duplicate_transport_ids_converts_without_failure():
    gateway = research.ResearchStop(name='Kathmandu', placeQuery='Kathmandu, Nepal')
    destination = Point(id='mardi', name='Mardi Himal', latitude=28.48, longitude=83.94)
    option = research.Option(id='transfer', mode='bus', label='Bus', minutes=420, sourceIds=['hank-0'])
    alternative = option.model_copy(update={'mode': 'taxi', 'label': 'Private transfer', 'minutes': 360})
    stops = [gateway] + [research.ResearchStop(name=f'Stop {i}', placeQuery=f'Stop {i}, Nepal') for i in range(11)] + [gateway]
    draft = research.RouteDraft(title='Twelve-stage journey', gateway=gateway, segments=[
        research.ResearchSegment(destination=stop, options=[option, alternative]) for stop in stops[1:]])
    points = [research.schematic_checkpoint(stop, destination, destination, i, len(stops)) for i, stop in enumerate(stops)]
    points[-1] = points[0]
    legs, _, _ = research.build_mapped_legs(draft, stops, points, 'test')
    assert len(legs) == 12
    assert all(len(leg.options) == 2 and len({o.id for o in leg.options}) == 2 for leg in legs)
    assert all(leg.selected in {o.id for o in leg.options} for leg in legs)
    assert all(left.end == right.start for left, right in zip(legs, legs[1:]))
