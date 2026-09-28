import type { ImageSourcePropType } from 'react-native';

export type TrekPoint = { name: string; latitude: number; longitude: number; elevation: number };

export type Trek = {
  id: string;
  name: string;
  region: string;
  days: string;
  maxElevation: number;
  difficulty: 'Moderate' | 'Challenging' | 'Strenuous';
  bestSeason: string;
  summary: string;
  permit: string;
  image: ImageSourcePropType;
  // Illustrative geometry for the demo. Verify against a licensed GPX source
  // before anyone relies on it in the field.
  route: TrekPoint[];
};

export const NEPAL_CENTER = { latitude: 28.15, longitude: 84.25 };

export const treks: Trek[] = [
  {
    id: 'mardi-himal',
    name: 'Mardi Himal',
    region: 'Annapurna',
    days: '5 days',
    maxElevation: 4500,
    difficulty: 'Moderate',
    bestSeason: 'Mar–May · Sep–Nov',
    summary: 'A short ridge walk to the base of Mardi Himal with close views of Machhapuchhre.',
    permit: 'ACAP + TIMS',
    image: require('../../assets/trek-mardi-himal.jpg'),
    route: [
      { name: 'Kande', latitude: 28.2233, longitude: 83.8406, elevation: 1770 },
      { name: 'Australian Camp', latitude: 28.2470, longitude: 83.8640, elevation: 1950 },
      { name: 'Deurali', latitude: 28.3010, longitude: 83.8920, elevation: 2700 },
      { name: 'Forest Camp', latitude: 28.3520, longitude: 83.9060, elevation: 2650 },
      { name: 'Low Camp', latitude: 28.4180, longitude: 83.9180, elevation: 3150 },
      { name: 'High Camp', latitude: 28.4760, longitude: 83.9260, elevation: 3600 },
      { name: 'Viewpoint', latitude: 28.5120, longitude: 83.9300, elevation: 4250 },
      { name: 'Base Camp', latitude: 28.5390, longitude: 83.9330, elevation: 4500 },
    ],
  },
  {
    id: 'annapurna-base-camp',
    name: 'Annapurna Base Camp',
    region: 'Annapurna',
    days: '9 days',
    maxElevation: 4130,
    difficulty: 'Challenging',
    bestSeason: 'Mar–May · Oct–Nov',
    summary: 'Into the Annapurna Sanctuary, ringed by a wall of 7,000 m and 8,000 m peaks.',
    permit: 'ACAP + TIMS',
    image: require('../../assets/trek-annapurna-base-camp.jpg'),
    route: [
      { name: 'Nayapul', latitude: 28.2960, longitude: 83.7290, elevation: 1070 },
      { name: 'Tikhedhunga', latitude: 28.3480, longitude: 83.7560, elevation: 1480 },
      { name: 'Ghorepani', latitude: 28.3980, longitude: 83.7660, elevation: 2870 },
      { name: 'Tadapani', latitude: 28.4380, longitude: 83.7980, elevation: 2630 },
      { name: 'Chhomrong', latitude: 28.4990, longitude: 83.8240, elevation: 2170 },
      { name: 'Deurali', latitude: 28.5760, longitude: 83.8620, elevation: 3230 },
      { name: 'Machhapuchhre BC', latitude: 28.6320, longitude: 83.8760, elevation: 3700 },
      { name: 'Annapurna BC', latitude: 28.6740, longitude: 83.8770, elevation: 4130 },
    ],
  },
  {
    id: 'langtang-valley',
    name: 'Langtang Valley',
    region: 'Langtang',
    days: '7 days',
    maxElevation: 3870,
    difficulty: 'Moderate',
    bestSeason: 'Mar–May · Sep–Dec',
    summary: 'A glacial valley north of Kathmandu, close to the Tibetan border and rich in Tamang culture.',
    permit: 'Langtang National Park + TIMS',
    image: require('../../assets/trek-langtang-valley.jpg'),
    route: [
      { name: 'Syabrubesi', latitude: 28.0830, longitude: 85.2660, elevation: 1460 },
      { name: 'Bamboo', latitude: 28.1580, longitude: 85.3520, elevation: 1960 },
      { name: 'Langtang Village', latitude: 28.2100, longitude: 85.5240, elevation: 3430 },
      { name: 'Mundu', latitude: 28.2270, longitude: 85.5820, elevation: 3540 },
      { name: 'Kyanjin Gompa', latitude: 28.2420, longitude: 85.6230, elevation: 3870 },
    ],
  },
  {
    id: 'everest-base-camp',
    name: 'Everest Base Camp',
    region: 'Khumbu',
    days: '12 days',
    maxElevation: 5364,
    difficulty: 'Strenuous',
    bestSeason: 'Mar–May · Oct–Nov',
    summary: 'The classic Khumbu walk to Everest Base Camp via Namche Bazaar and Tengboche.',
    permit: 'Sagarmatha NP + Khumbu permit',
    image: require('../../assets/trek-everest-base-camp.jpg'),
    route: [
      { name: 'Lukla', latitude: 27.6869, longitude: 86.7297, elevation: 2860 },
      { name: 'Phakding', latitude: 27.7140, longitude: 86.7160, elevation: 2610 },
      { name: 'Namche Bazaar', latitude: 27.8040, longitude: 86.7100, elevation: 3440 },
      { name: 'Tengboche', latitude: 27.8340, longitude: 86.7450, elevation: 3860 },
      { name: 'Dingboche', latitude: 27.8760, longitude: 86.8220, elevation: 4410 },
      { name: 'Lobuche', latitude: 27.9620, longitude: 86.7960, elevation: 4940 },
      { name: 'Gorakshep', latitude: 27.9960, longitude: 86.8300, elevation: 5164 },
      { name: 'Everest Base Camp', latitude: 28.0025, longitude: 86.8528, elevation: 5364 },
    ],
  },
];

export const trekById = (id: string) => treks.find(trek => trek.id === id) ?? null;

export function trekBounds(route: TrekPoint[]) {
  const latitudes = route.map(point => point.latitude);
  const longitudes = route.map(point => point.longitude);
  return {
    southwest: { latitude: Math.min(...latitudes), longitude: Math.min(...longitudes) },
    northeast: { latitude: Math.max(...latitudes), longitude: Math.max(...longitudes) },
  };
}

export function trekStats(route: TrekPoint[]) {
  let ascent = 0;
  let descent = 0;
  for (let index = 1; index < route.length; index++) {
    const delta = route[index].elevation - route[index - 1].elevation;
    if (delta > 0) ascent += delta;
    else descent -= delta;
  }
  return { ascent, descent, stops: route.length };
}

export type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

export const NEPAL_REGION: MapRegion = { latitude: 28.15, longitude: 84.25, latitudeDelta: 4.4, longitudeDelta: 7.8 };

export function regionForTrek(trek: Trek): MapRegion {
  const bounds = trekBounds(trek.route);
  const centerLat = (bounds.northeast.latitude + bounds.southwest.latitude) / 2;
  const centerLng = (bounds.northeast.longitude + bounds.southwest.longitude) / 2;
  // Longitudinal degrees compress towards the poles, so widen them to keep the framing round.
  const latitudeDelta = Math.max((bounds.northeast.latitude - bounds.southwest.latitude) * 1.9, 0.08);
  const longitudeDelta = Math.max((bounds.northeast.longitude - bounds.southwest.longitude) * 1.9, 0.08) / Math.cos((centerLat * Math.PI) / 180);
  return { latitude: centerLat, longitude: centerLng, latitudeDelta, longitudeDelta };
}
