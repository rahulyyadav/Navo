import { requestJourneyAPI } from '@/lib/api';
import { decodeItinerary, decodeLegs, toJourneyPoint, pointDistanceM, validPoint, type JourneyPoint, type JourneySource, type Itinerary, type JourneyLeg } from './types';
export type PreparationStatus = {
    id: string;
    status: 'preparing' | 'ready' | 'failed' | 'needs_user_choice';
    template?: Itinerary;
    message?: string;
    stage?: 'hank_research' | 'julia_route' | 'thompson_check' | 'thompson_recheck' | 'julia_revision' | 'paul_review' | 'complete' | 'map_selection';
    modelCalls?: number;
    warnings?: string[];
    decisions?: string[];
    mapChoices?: { type: 'map_choice_required'; stopIndex: number; stopName: string; candidates: { id: string; name: string; type: string; region: string; latitude: number; longitude: number }[] };
};
function status(v: PreparationStatus) {
    if (!v || !['ready', 'preparing', 'failed', 'needs_user_choice'].includes(v.status) || !/^[a-f0-9]{24}$/.test(v.id))
        throw new Error('Journey preparation could not be read. Please retry.');
    if (v.status === 'needs_user_choice') {
        const prompt = v.mapChoices;
        if (!prompt || prompt.type !== 'map_choice_required' || !Number.isInteger(prompt.stopIndex) || prompt.stopIndex < 0 || typeof prompt.stopName !== 'string' || !prompt.stopName || !Array.isArray(prompt.candidates) || prompt.candidates.length < 1 || prompt.candidates.length > 6 || !prompt.candidates.every(candidate => candidate && typeof candidate.id === 'string' && typeof candidate.name === 'string' && typeof candidate.type === 'string' && typeof candidate.region === 'string' && Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude)))
            throw new Error('The map search response was incomplete. Retry preparation to refresh it.');
    }
    if (v.status === 'ready') {
        v.template = decodeItinerary(v.template);
        if (!v.template.legs.length)
            throw new Error('No journey stages were found.');
    }
    return v;
}
export async function prepareItinerary(destination: JourneyPoint, origin: JourneyPoint, startDate: string, mapChoices: Record<string, string> = {}) {
    return status(await requestJourneyAPI<PreparationStatus>('/journey-itineraries/prepare', { destination: toJourneyPoint(destination), origin: toJourneyPoint(origin), startDate, mapChoices }));
}
export async function itineraryStatus(id: string) {
    return status(await requestJourneyAPI<PreparationStatus>(`/journey-itineraries/${id}`, undefined, 'GET'));
}
export async function requestJourneyReview(id: string) {
    return requestJourneyAPI<{ queued: boolean; lastReviewedAt?: string }>(`/journeys/${id}/review`, {});
}
export async function decideJourneyRevision(id: string, decision: 'accept' | 'reject', acceptedUnverified: string[] = []) {
    return requestJourneyAPI<{ accepted: boolean; dismissed?: boolean }>(`/journeys/${id}/revision`, { decision, acceptedUnverified });
}
export async function connectOrigin(template: Itinerary, origin: JourneyPoint) {
    const value = await requestJourneyAPI<{
        legs: JourneyLeg[];
        sources: JourneySource[];
    }>('/journey-itineraries/approach', { templateId: template.id, revision: template.researchedAt, origin: toJourneyPoint(origin) });
    if (!Array.isArray(value?.sources) || value.sources.some(s => !s || typeof s.id !== 'string' || typeof s.title !== 'string' || typeof s.url !== 'string' || !s.url.startsWith('https://')))
        throw new Error('Approach information is incomplete.');
    return { legs: decodeLegs(value.legs, value.sources), sources: value.sources };
}
export function unconfirmedApproach(template: Itinerary, origin: JourneyPoint): { legs: JourneyLeg[]; sources: JourneySource[] } {
    return {
        legs: [{ id: 'approach-pending', start: origin, end: template.legs[0].start,
            selected: 'transfer', geometry: [], geometryKind: 'schematic',
            options: [{ id: 'transfer', mode: 'taxi', label: 'Transfer to confirm', minutes: null,
                note: 'Arrange travel to the departure point. Transport type, access and travel time still need confirmation.',
                sourceIds: template.sources.slice(0, 10).map(source => source.id),
                verification: 'unconfirmed', requiresUserDecision: true,
                warning: 'The connection service is unavailable. This is a planning placeholder, with no verified transport or road route.' }] }],
        sources: template.sources.slice(0, 10),
    };
}
export async function loadStageGeometry(template: Itinerary, legId: string, optionId: string) {
    const v = await requestJourneyAPI<{
        geometry: JourneyPoint[];
        geometryKind: JourneyLeg['geometryKind'];
    }>('/journey-itineraries/stage-route', { templateId: template.id, revision: template.researchedAt, legId, optionId });
    const leg = template.legs.find(item => item.id === legId);
    if (!leg || !v || !['road', 'trail', 'schematic'].includes(v.geometryKind) || !Array.isArray(v.geometry) || v.geometry.length > 10000 || !v.geometry.every(validPoint) || v.geometry.length > 1 && (pointDistanceM(v.geometry[0], leg.start) > 1500 || pointDistanceM(v.geometry[v.geometry.length - 1], leg.end) > 1500))
        throw new Error('The mapped path is incomplete.');
    return v;
}
