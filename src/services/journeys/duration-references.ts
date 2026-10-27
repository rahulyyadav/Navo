import type { PersonalJourney } from './types';

// Exact, directional operator itinerary matches. Never distribute a full-day
// estimate over smaller stages or confuse Upper Viewpoint with Base Camp.
const reference = { id: 'mardi-duration-20261027', title: 'Mardi Himal operator itinerary · section walking and driving estimates', url: 'https://mardihimal.com/trek/itinerary/', checkedAt: '2026-10-27T00:00:00Z' };
const name = (value: string) => value.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
const ranges = [
    { from: 'forest camp', to: 'low camp', modes: ['walk'], minimum: 120, maximum: 180 },
    { from: 'low camp', to: 'high camp', modes: ['walk'], minimum: 240, maximum: 300 },
];
export function addDurationReferences(journey: PersonalJourney): PersonalJourney {
    if (journey.template.destination.canonicalId !== 'mardi-himal' && journey.template.destination.id !== 'mardi-himal') return journey;
    let changed = false;
    const legs = journey.template.legs.map(leg => {
        const match = ranges.find(range => name(leg.start.name) === range.from && name(leg.end.name) === range.to);
        if (!match) {
            return { ...leg, options: leg.options.map(option => {
                if (!option.durationRange?.sourceIds.includes(reference.id)) return option;
                changed = true;
                return { ...option, durationRange: null };
            }) };
        }
        return { ...leg, options: leg.options.map(option => {
            if (option.minutes !== null || option.durationRange || !match.modes.includes(option.mode)) return option;
            changed = true;
            return { ...option, sourceIds: [...new Set([...option.sourceIds, reference.id])], durationRange: { minimum: match.minimum, maximum: match.maximum, sourceIds: [reference.id] } };
        }) };
    });
    if (!changed) return journey;
    return { ...journey, template: { ...journey.template, legs, sources: [...journey.template.sources.filter(source => source.id !== reference.id), reference] } };
}
