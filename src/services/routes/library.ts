import { routeStats, type ImportedRoute } from './gpx';
export type RouteLibraryOrder = 'recent' | 'shortest' | 'longest';
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function indexRouteLibrary(routes: ImportedRoute[]) {
  return routes.map(route => ({ route, stats: routeStats(route) }));
}
export function searchRouteLibrary(entries: ReturnType<typeof indexRouteLibrary>, query: string, order: RouteLibraryOrder) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return entries.filter(({route}) => words.every(word => normalize(route.name).includes(word))).sort((a,b) => {
    const comparison = order === 'recent' ? Date.parse(b.route.importedAt)-Date.parse(a.route.importedAt) : order === 'shortest' ? a.stats.metres-b.stats.metres : b.stats.metres-a.stats.metres;
    return (Number.isFinite(comparison) ? comparison : 0) || a.route.name.localeCompare(b.route.name) || a.route.id.localeCompare(b.route.id);
  });
}
