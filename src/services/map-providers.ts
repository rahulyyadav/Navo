// Public tile templates only. Server credentials never belong here.
export const outdoorTiles = process.env.EXPO_PUBLIC_OUTDOOR_TILES_URL?.trim() || 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
export const satelliteTiles = process.env.EXPO_PUBLIC_SATELLITE_TILES_URL?.trim() || '';
export const outdoorAttribution = process.env.EXPO_PUBLIC_OUTDOOR_TILES_ATTRIBUTION?.trim() || '© OpenStreetMap contributors, SRTM · OpenTopoMap (CC BY-SA)';
export const satelliteAttribution = process.env.EXPO_PUBLIC_SATELLITE_TILES_ATTRIBUTION?.trim() || '';
export function validTileTemplate(value: string) {
  if (!['{z}', '{x}', '{y}'].every(part => value.includes(part)) || /[<>"'\s]/.test(value)) return false;
  try { const url = new URL(value.replace(/\{[szxy]\}/g, '0')); if (url.protocol !== 'https:' || url.username || url.password) return false; } catch { return false; }
  return /^https:\/\//.test(value) && ['{z}', '{x}', '{y}'].every(part => value.includes(part)) && !/[<>"'\s]/.test(value);
}
