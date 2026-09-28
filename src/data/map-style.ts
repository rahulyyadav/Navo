// Google Maps styling. Apple Maps on iOS ignores these entries and keeps its own palette.
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0D141A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080D12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A9AA6' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2A3437' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#B9C6CE' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#14202B' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14271F' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6E8B7A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1D2E3F' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0D141A' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7E8F9B' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#26394C' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1A24' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3F5A6B' }] },
];

export const trekColors: Record<string, string> = {
  'mardi-himal': '#E4FF89',
  'annapurna-base-camp': '#8FD3FF',
  'langtang-valley': '#FFB86B',
  'everest-base-camp': '#FF9D8A',
};

export const colorForTrek = (id: string) => trekColors[id] ?? '#E4FF89';
