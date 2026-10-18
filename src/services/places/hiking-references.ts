import type { Coordinate, Place } from './types';
import { distance } from '../trekking/navigation';
// OSM/Photon landmark records checked 14 October 2026. Not surveyed trails or access guarantees.
export const nepalHikingPlaces: (Place & {aliases:string[]})[] = [
  {
    "id": "osm-reference:node:3490869705",
    "name": "Phulchowki hill",
    "fullName": "Phulchowki hill (Phulchoki) · Godawari / Kathmandu Valley, Nepal",
    "latitude": 27.5710397,
    "longitude": 85.4067119,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "peak",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/3490869705",
    "aliases": [
      "phulchowki",
      "phulchoki",
      "pulchowki",
      "fulchowki",
      "फुल्चोकी",
      "फुलचोकी"
    ]
  },
  {
    "id": "osm-reference:node:2662582253",
    "name": "Shivapuri Peak",
    "fullName": "Shivapuri Peak · Kathmandu Valley, Nepal",
    "latitude": 27.8122473,
    "longitude": 85.3843627,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "peak",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/2662582253",
    "aliases": [
      "shivapuri",
      "shivapuri trekking",
      "shivapuri hike",
      "शिवपुरी"
    ]
  },
  {
    "id": "osm-reference:node:12615583701",
    "name": "Dhap Dam",
    "fullName": "Dhap Dam · Kathmandu Valley, Nepal",
    "latitude": 27.8076625,
    "longitude": 85.4574587,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "attraction",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/12615583701",
    "aliases": [
      "dhap dam",
      "dhap dham",
      "dhap damp",
      "dhap"
    ]
  },
  {
    "id": "osm-reference:way:85552443",
    "name": "Budhanilkantha Temple",
    "fullName": "Budhanilkantha Temple · Kathmandu Valley, Nepal",
    "latitude": 27.7781261,
    "longitude": 85.3623412,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "place_of_worship",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/way/85552443",
    "aliases": [
      "budhanilkantha",
      "budhaniklatha",
      "budanilkantha",
      "buddhanilkantha"
    ]
  },
  {
    "id": "osm-reference:node:1341029550",
    "name": "Sundarijal",
    "fullName": "Sundarijal · Kathmandu Valley, Nepal",
    "latitude": 27.758005,
    "longitude": 85.419189,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "suburb",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/1341029550",
    "aliases": [
      "sundarijal",
      "sundari jal"
    ]
  },
  {
    "id": "osm-reference:way:206938169",
    "name": "Nagi Gompa",
    "fullName": "Nagi Gompa · Kathmandu Valley, Nepal",
    "latitude": 27.7832987,
    "longitude": 85.3816777,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "place_of_worship",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/way/206938169",
    "aliases": [
      "nagi gompa",
      "nagi gumba"
    ]
  },
  {
    "id": "osm-reference:node:1341029341",
    "name": "Chisapani · Shivapuri area",
    "fullName": "Chisapani · Shivapuri area · Kathmandu Valley, Nepal",
    "latitude": 27.8255523,
    "longitude": 85.4483889,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "hamlet",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/1341029341",
    "aliases": [
      "chisapani"
    ]
  },
  {
    "id": "osm-reference:node:316984476",
    "name": "Nagarkot village",
    "fullName": "Nagarkot village · Kathmandu Valley, Nepal",
    "latitude": 27.718508,
    "longitude": 85.51973,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Kathmandu Valley",
    "type": "hamlet",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/316984476",
    "aliases": [
      "nagarkot"
    ]
  },
  {
    "id": "osm-reference:node:7259604786",
    "name": "Sarangkot viewpoint",
    "fullName": "Sarangkot viewpoint · Pokhara, Nepal",
    "latitude": 28.2457224,
    "longitude": 83.9488462,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Pokhara",
    "type": "viewpoint",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/7259604786",
    "aliases": [
      "sarangkot"
    ]
  },
  {
    "id": "osm-reference:node:1366597402",
    "name": "Australian Camp",
    "fullName": "Australian Camp · Pokhara, Nepal",
    "latitude": 28.3044635,
    "longitude": 83.8282946,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Pokhara",
    "type": "hamlet",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/1366597402",
    "aliases": [
      "australian camp",
      "australia camp"
    ]
  },
  {
    "id": "osm-reference:node:988616263",
    "name": "Dhampus",
    "fullName": "Dhampus · Pokhara, Nepal",
    "latitude": 28.300303,
    "longitude": 83.858681,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Pokhara",
    "type": "village",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/988616263",
    "aliases": [
      "dhampus"
    ]
  },
  {
    "id": "osm-reference:way:596603713",
    "name": "World Peace Pagoda",
    "fullName": "World Peace Pagoda · Pokhara, Nepal",
    "latitude": 28.2010206,
    "longitude": 83.9447414,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Pokhara",
    "type": "place_of_worship",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/way/596603713",
    "aliases": [
      "world peace pagoda",
      "peace pagoda",
      "shanti stupa"
    ]
  },
  {
    "id": "osm-reference:node:316997699",
    "name": "Poon Hill",
    "fullName": "Poon Hill · Annapurna, Nepal",
    "latitude": 28.4000425,
    "longitude": 83.6895402,
    "country": "Nepal",
    "countryCode": "np",
    "region": "Annapurna",
    "type": "peak",
    "provider": "osm-reference",
    "source": "https://www.openstreetmap.org/node/316997699",
    "aliases": [
      "poon hill",
      "pun hill"
    ]
  }
];
const words = (q: string) => q.normalize('NFKC').toLowerCase()
  .replace(/\b(hikes?|hiking|treks?|trekking|hills?|mountains?|to|at|in|of|nepal)\b/g, ' ')
  .replace(/[^a-z\u0900-\u097f]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const normalize = (q: string) => words(q).join('');
export function hikingReferences(query: string, near?: Coordinate): Place[] {
  const q = normalize(query);
  if (q.length < 2 || q === 'pulchowk') return [];
  const tokens = words(query).map(token => token === 'ktm' ? 'kathmandu' : token);
  return nepalHikingPlaces.filter(p => {
    // An alias prefix supports autocomplete and spelling variants. For longer
    // queries, require every word to match the same landmark or its region.
    if (p.aliases.some(alias => normalize(alias).startsWith(q))) return true;
    const candidate = [...words(p.name), ...words(p.region ?? ''), ...p.aliases.flatMap(words)];
    return tokens.every(token => candidate.some(word => word.startsWith(token)));
  }).map(p => ({...p, ...(near ? {distanceM: distance(near, p)} : {})}));
}
