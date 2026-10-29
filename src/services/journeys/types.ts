import { isCoordinate } from '../places/types';
export type JourneyPoint = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    fullName?: string;
    region?: string;
    country?: string;
    placeType?: string;
    /** Stable Navo identity when this point came from the curated catalogue. */
    canonicalId?: string;
    /** The endpoint meaning is explicit so a trek name is not confused with a peak/viewpoint/camp. */
    destinationMeaning?: string;
    provider?: 'catalogue' | 'photon' | 'coordinates' | 'osm-reference';
    providerId?: string;
    /** Schematic planning point; never treat this as precise map geometry. */
    coordinatesApproximate?: boolean;
};
/** Construct the API location shape; TypeScript types don't strip runtime metadata. */
export function toJourneyPoint(value: JourneyPoint): JourneyPoint {
    return {
        id: value.id, name: value.name, latitude: value.latitude, longitude: value.longitude,
        fullName: value.fullName, region: value.region, country: value.country,
        placeType: value.placeType, canonicalId: value.canonicalId,
        destinationMeaning: value.destinationMeaning, provider: value.provider,
        providerId: value.providerId, coordinatesApproximate: value.coordinatesApproximate,
    };
}
export type JourneySource = {
    id: string;
    title: string;
    url: string;
    checkedAt: string;
    publishedAt?: string | null;
};
export type TravelMode = 'taxi' | 'bus' | 'jeep' | 'flight' | 'walk';
export type TravelOption = {
    id: string;
    mode: TravelMode;
    label: string;
    minutes: number | null;
    durationRange?: { minimum: number; maximum: number; sourceIds: string[] } | null;
    costNprPerPerson?: { minimum: number; maximum: number; sourceIds: string[] } | null;
    note: string;
    sourceIds: string[];
    verificationSourceIds?: string[];
    verification?: 'open-confirmed' | 'closed-confirmed' | 'unconfirmed';
    requiresUserDecision?: boolean;
    warning?: string | null;
};
export type JourneyLeg = {
    id: string;
    start: JourneyPoint;
    end: JourneyPoint;
    options: TravelOption[];
    selected: string;
    geometry: JourneyPoint[];
    geometryKind: 'schematic' | 'road' | 'trail';
};
export type Itinerary = {
    version: 1;
    id: string;
    destination: JourneyPoint;
    title: string;
    destinationMeaning?: string | null;
    legs: JourneyLeg[];
    sources: JourneySource[];
    researchedAt: string;
    expiresAt: string;
    provenance: 'curated' | 'researched';
    readiness?: 'ready' | 'needs-user-choice' | 'blocked';
    warnings?: string[];
    agentReview?: { agent: 'Hank' | 'Julia' | 'Thompson' | 'Paul'; summary: string; sourceIds: string[]; legIds: string[] }[];
    modelEvidence?: { agent: 'Hank' | 'Julia' | 'Thompson' | 'Paul'; provider: 'nebius' | 'openrouter'; model: string; elapsedMs: number; promptTokens?: number | null; completionTokens?: number | null }[];
};
export type JourneyPreferences = {
    origin: JourneyPoint;
    startDate: string;
    budget: string;
    currency: 'NPR';
    finishDate: string;
};
export type PersonalJourney = {
    version: 1;
    id: string;
    template: Itinerary;
    preferences: JourneyPreferences;
    approach: JourneyLeg[];
    approachSources: JourneySource[];
    selections: Record<string, string>;
    completed: number;
    phase: 'draft' | 'ready' | 'travelling' | 'paused' | 'completed';
    acceptedUnverified?: string[];
    reviewAcknowledged?: boolean;
    lastReviewedAt?: string | null;
    proposedRevision?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
};
export type JourneyLibrary = {
    version: 1;
    activeId: string | null;
    journeys: PersonalJourney[];
};
export const modeIcon: Record<TravelMode, string> = { taxi: '🚕', bus: '🚌', jeep: '🚙', flight: '✈', walk: '🥾' };
export const selectedOption = (leg: JourneyLeg, selections: Record<string, string>) => leg.options.find(o => o.id === (selections[leg.id] ?? leg.selected)) ?? leg.options[0];
export function durationLabel(minutes: number | null) {
    if (minutes === null)
        return 'Approx. time unavailable';
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours ? `${hours}h${rest ? ` ${rest}m` : ''} est.` : `${rest} min est.`;
}
export function validPoint(value: unknown): value is JourneyPoint {
    if (!isCoordinate(value))
        return false;
    const p = value as JourneyPoint;
    // Firestore/Pydantic serializes optional fields as null. Treat null the
    // same as omitted on the client; rejecting it makes an otherwise valid
    // ready itinerary look like an incomplete stage response.
    return typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 200 && typeof p.name === 'string' && p.name.length > 0 && p.name.length <= 150 && (p.canonicalId == null || typeof p.canonicalId === 'string') && (p.destinationMeaning == null || typeof p.destinationMeaning === 'string');
}
export function validDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function pointDistanceM(a: JourneyPoint, b: JourneyPoint) {
    const latitude = ((a.latitude + b.latitude) / 2) * Math.PI / 180;
    return Math.hypot((a.latitude - b.latitude) * 111195, (a.longitude - b.longitude) * 111195 * Math.cos(latitude));
}
export function decodeItinerary(value: unknown): Itinerary {
    const v = value as Itinerary;
    if (!v || v.version !== 1 || !/^[a-f0-9]{24}$/.test(v.id) || !validPoint(v.destination) || typeof v.title !== 'string' || !Array.isArray(v.sources) || !v.sources.length || v.sources.length > 20 || !v.sources.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && /^https:\/\//.test(s.url) && Number.isFinite(Date.parse(s.checkedAt))) || !Number.isFinite(Date.parse(v.researchedAt)) || !Number.isFinite(Date.parse(v.expiresAt)))
        throw new Error('The journey information is incomplete. Please retry.');
    if (!Array.isArray(v.legs) || !v.legs.length) throw new Error('No journey stages were found.');
    decodeLegs(v.legs, v.sources);
    if (v.agentReview != null && (!Array.isArray(v.agentReview) || v.agentReview.length > 4 || !v.agentReview.every(entry =>
        entry && ['Hank', 'Julia', 'Thompson', 'Paul'].includes(entry.agent) && typeof entry.summary === 'string' && entry.summary.length <= 500 &&
        Array.isArray(entry.sourceIds) && entry.sourceIds.every(id => v.sources.some(source => source.id === id)) &&
        Array.isArray(entry.legIds) && entry.legIds.every(id => v.legs.some(leg => leg.id === id)))))
        throw new Error('The journey review references an unavailable stage or source. Please reload.');
    if (v.modelEvidence != null && (!Array.isArray(v.modelEvidence) || v.modelEvidence.length > 100 || !v.modelEvidence.every(call =>
        call && ['Hank', 'Julia', 'Thompson', 'Paul'].includes(call.agent) && ['nebius', 'openrouter'].includes(call.provider) &&
        typeof call.model === 'string' && call.model.length > 0 && call.model.length <= 200 &&
        Number.isInteger(call.elapsedMs) && call.elapsedMs >= 0)))
        throw new Error('The journey model details are incomplete. Please reload.');
    v.destination = toJourneyPoint(v.destination);
    return v;
}
export function decodeLegs(value: unknown, sources: JourneySource[]): JourneyLeg[] {
    if (!Array.isArray(value) || value.length > 45)
        throw new Error('The journey stages are incomplete.');
    const ids = new Set<string>();
    for (const leg of value as JourneyLeg[]) {
        if (!leg || typeof leg.id !== 'string' || ids.has(leg.id) || !validPoint(leg.start) || !validPoint(leg.end) || !Array.isArray(leg.options) || !leg.options.length || leg.options.length > 5 || !['road', 'trail', 'schematic'].includes(leg.geometryKind) || !Array.isArray(leg.geometry) || leg.geometry.length > 10000 || !leg.geometry.every(validPoint))
            throw new Error('The journey stages are incomplete.');
        ids.add(leg.id);
        if (!leg.options.every(o => o && typeof o.id === 'string' && typeof o.label === 'string' && typeof o.note === 'string' && Object.hasOwn(modeIcon, o.mode) && (o.minutes === null || Number.isInteger(o.minutes) && o.minutes > 0 && o.minutes <= 20000) && Array.isArray(o.sourceIds) && o.sourceIds.length && o.sourceIds.every(id => sources.some(s => s.id === id))) || !leg.options.some(o => o.id === leg.selected))
            throw new Error('The transport options are incomplete.');
        leg.start = toJourneyPoint(leg.start);
        leg.end = toJourneyPoint(leg.end);
        leg.geometry = leg.geometry.map(toJourneyPoint);
    }
    return value;
}
export type JourneyChatSummary = {
    title: string;
    completed: number;
    legs: {
        start: string;
        end: string;
        mode: TravelMode;
        minutes: number | null;
        note: string;
    }[];
};
export function journeyChatSummary(journey: PersonalJourney): JourneyChatSummary {
    return { title: journey.template.title, completed: journey.completed, legs: [...journey.approach, ...journey.template.legs].map(leg => { const option = selectedOption(leg, journey.selections); return { start: leg.start.name, end: leg.end.name, mode: option.mode, minutes: option.minutes, note: option.note }; }) };
}

/** Viewing a plan never implies that its travel warnings have been resolved. */
export function journeyReview(journey: PersonalJourney) {
    const legs = [...journey.approach, ...journey.template.legs];
    const closed = legs.filter(leg => selectedOption(leg, journey.selections).verification === 'closed-confirmed');
    const pending = legs.filter(leg => {
        const option = selectedOption(leg, journey.selections);
        return option.requiresUserDecision && option.verification === 'unconfirmed' &&
            !journey.acceptedUnverified?.includes(`${leg.id}:${option.id}`);
    });
    const hasSpecificChoice = legs.some(leg => { const option = selectedOption(leg, journey.selections); return option.requiresUserDecision && option.verification === 'unconfirmed'; });
    const needsAcknowledgement = journey.template.readiness === 'needs-user-choice' && !journey.reviewAcknowledged && !hasSpecificChoice;
    const invalidIdentity = legs.some(leg => [leg.start, leg.end].some(point => point && invalidCheckpointName(point.name)));
    return { closed, pending, needsAcknowledgement, invalidIdentity,
        canStart: !invalidIdentity && journey.template.readiness !== 'blocked' && !closed.length && !pending.length && !needsAcknowledgement };
}

/** Old saved research may contain prose in identity fields. Never guess a place from it. */
export function checkpointLabel(point: JourneyPoint) {
    return invalidCheckpointName(point.name) ? 'Checkpoint needs review' : point.name;
}
export function invalidCheckpointName(name: string) {
    return name.length > 85 || name.split(/\s+/).length > 12 || /\b(is the|from here|you should|practical public|for reaching)\b/i.test(name);
}
export function stageAttention(leg: JourneyLeg, selections: Record<string, string>) {
    const option = selectedOption(leg, selections);
    if (invalidCheckpointName(leg.start.name) || invalidCheckpointName(leg.end.name)) return 'Checkpoint identity needs review';
    if (option.verification === 'closed-confirmed') return 'Reported closure';
    if (option.requiresUserDecision) return 'Decision needed';
    if (option.verification !== 'open-confirmed') return 'Current access unverified';
    return null;
}
export function chooseTravel(journey: PersonalJourney, legId: string, optionId: string): PersonalJourney {
    const legs = [...journey.approach, ...journey.template.legs];
    const index = legs.findIndex(leg => leg.id === legId);
    if (index < journey.completed || index < 0) throw new Error('Completed stages cannot be changed.');
    const option = legs[index].options.find(item => item.id === optionId);
    if (!option || option.verification === 'closed-confirmed') throw new Error('Choose an available travel option.');
    return { ...journey, ...(journey.completed === 0 ? { phase: 'draft' as const } : {}), selections: { ...journey.selections, [legId]: optionId } };
}
export function journeySummary(journey: PersonalJourney) {
    const legs = [...journey.approach, ...journey.template.legs];
    const options = legs.map(leg => selectedOption(leg, journey.selections));
    const allTimed = options.length > 0 && options.every(o => o.minutes !== null || o.durationRange);
    return { stages: legs.length, unknownDurations: options.filter(o => o.minutes === null && !o.durationRange).length,
        minutes: options.every(o => o.minutes !== null) ? options.reduce((n, o) => n + (o.minutes ?? 0), 0) : null,
        estimatedRange: allTimed ? {
            minimum: options.reduce((n, o) => n + (o.durationRange?.minimum ?? o.minutes ?? 0), 0),
            maximum: options.reduce((n, o) => n + (o.durationRange?.maximum ?? o.minutes ?? 0), 0),
        } : null,
        attention: legs.filter(leg => stageAttention(leg, journey.selections)),
        expired: Date.parse(journey.template.expiresAt) < Date.now() };
}

/** Source estimates are planning ranges, independent of current-access status. */
export function optionDurationLabel(option: TravelOption) {
    const range = option.durationRange;
    return range ? `Approx. time: ${durationLabel(range.minimum).replace(' est.', '')}–${durationLabel(range.maximum).replace(' est.', '')}` : option.minutes === null ? 'Approx. time unavailable' : `Approx. time: ${durationLabel(option.minutes).replace(' est.', '')}`;
}

export function budgetSelections(legs: JourneyLeg[], budget: string) {
    const amount = Number(budget);
    const selections: Record<string, string> = {};
    let knownMaximum = 0, unknown = 0;
    if (!budget || !Number.isFinite(amount) || amount <= 0) return { selections, knownMaximum, unknown: legs.length };
    for (const leg of legs) {
        const priced = leg.options.filter(option => option.verification !== 'closed-confirmed' && option.costNprPerPerson && option.costNprPerPerson.maximum <= amount - knownMaximum)
            .sort((a, b) => a.costNprPerPerson!.maximum - b.costNprPerPerson!.maximum);
        if (!priced.length) { unknown++; continue; }
        const option = priced[0];
        selections[leg.id] = option.id;
        knownMaximum += option.costNprPerPerson!.maximum;
    }
    return { selections, knownMaximum, unknown };
}
