import type { Coordinate, Place } from './types';
import { distance } from '../trekking/navigation';
// Public mapped landmark, not a surveyed trail or proof of legal access.
const phulchowki: Place = {
  id: 'osm-reference:node:3490869705', name: 'Phulchowki hill',
  fullName: 'Phulchowki hill (Phulchoki) · Godawari / Kathmandu Valley, Nepal',
  latitude: 27.5710397, longitude: 85.4067119, country: 'Nepal', countryCode: 'np',
  region: 'Bagmati Province', type: 'peak', provider: 'osm-reference',
  source: 'https://www.openstreetmap.org/node/3490869705',
};
export function hikingReferences(query: string, near?: Coordinate): Place[] {
  const q = query.toLowerCase().replace(/\b(hike|hiking|trek|trekking|hill|mountain|to|at|in|of|nepal)\b/g, '').replace(/[^a-z\u0900-\u097f]/g, '');
  if (q.length < 3 || q === 'pulchowk') return [];
  if (!['phulchowki', 'phulchoki', 'pulchowki', 'fulchowki', 'फुल्चोकी', 'फुलचोकी'].some(alias => alias.startsWith(q) || q === alias)) return [];
  return [{ ...phulchowki, ...(near ? { distanceM: distance(near, phulchowki) } : {}) }];
}
