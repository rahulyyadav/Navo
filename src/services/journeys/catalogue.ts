import type { JourneyPoint } from './types';
import type { Place } from '../places/types';

export type CatalogueDestination = JourneyPoint & { aliases: string[] };

// These are route endpoints, not broad mountain/region pins. Keep the meaning
// attached to the point so research cannot silently swap ABC for a nearby
// viewpoint or Mardi High Camp for Mardi Base Camp.
export const journeyDestinations: CatalogueDestination[] = [
    {
        id: 'annapurna-base-camp',
        canonicalId: 'annapurna-base-camp',
        name: 'Annapurna Base Camp',
        latitude: 28.674,
        longitude: 83.877,
        fullName: 'Annapurna Base Camp, Annapurna Sanctuary, Nepal',
        region: 'Annapurna',
        country: 'Nepal',
        placeType: 'trek destination',
        destinationMeaning: 'Annapurna Base Camp endpoint',
        provider: 'catalogue',
        aliases: ['abc', 'abc trek', 'annapurna', 'annapurna trek', 'annapurna base camp trek'],
    },
    {
        id: 'mardi-himal',
        canonicalId: 'mardi-himal',
        name: 'Mardi Himal Trek',
        latitude: 28.539,
        longitude: 83.933,
        fullName: 'Mardi Himal Base Camp, Kaski, Nepal',
        region: 'Kaski',
        country: 'Nepal',
        placeType: 'trek destination',
        destinationMeaning: 'Mardi Himal Base Camp endpoint',
        provider: 'catalogue',
        aliases: ['mardi', 'mardi himal', 'mardi himal trek', 'mardi base camp', 'mardi himal base camp'],
    },
];

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const generic = new Set(['a', 'an', 'the', 'trek', 'treks', 'trekking', 'hike', 'hiking', 'route', 'routes', 'to', 'in', 'nepal']);
const tokens = (value: string) => normalize(value).split(/\s+/).filter(token => token && !generic.has(token));

export function queryMatchesPlaceName(query: string, place: Pick<Place, 'name'> | Pick<JourneyPoint, 'name'>) {
    const wanted = tokens(query);
    if (!wanted.length) return true;
    const name = normalize(place.name);
    return wanted.every(token => name.includes(token));
}

export function matchingDestinations(query: string): CatalogueDestination[] {
    const q = normalize(query);
    if (!q) return journeyDestinations;
    const wanted = tokens(query);
    return journeyDestinations
        .map(destination => {
            const name = normalize(destination.name);
            const alias = destination.aliases.map(normalize);
            const exact = alias.includes(q) || name === q;
            const starts = alias.some(value => value.startsWith(q)) || name.startsWith(q);
            const containsAll = wanted.length > 0 && wanted.every(token => `${name} ${alias.join(' ')}`.includes(token));
            // Region is intentionally not part of this match. A query for
            // "Annapurna" must not silently become Poon Hill.
            const score = exact ? 100 : starts ? 80 : containsAll ? 60 : 0;
            return { destination, score };
        })
        .filter(value => value.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(value => value.destination);
}

export function cataloguePoint(destination: CatalogueDestination): JourneyPoint {
    const { aliases: _aliases, ...point } = destination;
    return point;
}
