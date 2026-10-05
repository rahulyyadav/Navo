export type SearchPlace = { id: string; name: string; region: string; kind: 'trek' | 'day'; detail: string; aliases: string[] };
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g,' ').trim();
export function recommendPlaces(places: SearchPlace[], query: string): SearchPlace[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!words.length) return places.filter(place => place.kind === 'day').slice(0,3);
  return places.map(place => {
    const name = normalize(place.name); const haystack = normalize([place.name, place.region, place.detail, ...place.aliases].join(' '));
    const matches = words.every(word => haystack.includes(word));
    return { place, score: matches ? words.reduce((score,word) => score + (name.startsWith(word) ? 4 : name.includes(word) ? 2 : 1),0) : 0 };
  }).filter(result => result.score > 0).sort((a,b) => b.score - a.score || a.place.name.localeCompare(b.place.name)).slice(0,6).map(result => result.place);
}
