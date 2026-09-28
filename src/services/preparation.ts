export const essentials = [
  { id: 'permits', section: 'Before you leave', label: 'Confirm permits, TIMS and guide requirements', detail: 'Check your exact route, nationality and current local rules with NTB and your registered operator.' },
  { id: 'weather', section: 'Before you leave', label: 'Check weather and trail conditions', detail: 'Read DHM warnings and ask locally about landslides, snow, river crossings and closures.' },
  { id: 'insurance', section: 'Before you leave', label: 'Review insurance and evacuation cover', detail: 'Confirm that your maximum altitude and planned activities are covered. Save the assistance number.' },
  { id: 'contact', section: 'Before you leave', label: 'Leave your itinerary with someone', detail: 'Agree on check-in times and what to do if you are overdue.' },
  { id: 'navigation', section: 'In your pack', label: 'Offline map, route and backup power', detail: 'Download a verified map in an offline-capable app. Navo’s online tiles are not an offline map.' },
  { id: 'water', section: 'In your pack', label: 'Drinking water and treatment', detail: 'Carry refillable bottles and a reliable way to treat water.' },
  { id: 'layers', section: 'In your pack', label: 'Warm layers, rain shell and sun protection', detail: 'Include gloves, a hat, sunglasses and suitable footwear for the forecast.' },
  { id: 'kit', section: 'In your pack', label: 'Headlamp, first aid and personal medicines', detail: 'Carry spare power, blister care, snacks, cash and copies of your documents.' },
  { id: 'altitude', section: 'On the trail', label: 'Review altitude illness signs with your team', detail: 'Do not ascend with symptoms of altitude illness. Worsening symptoms require descent and medical help.' },
  { id: 'respect', section: 'On the trail', label: 'Plan for waste and local customs', detail: 'Carry rubbish out, respect sacred sites and ask before photographing people.' },
] as const;
export type Preparation = { date: string; notes: string; checked: string[] };
export const emptyPreparation: Preparation = { date: '', notes: '', checked: [] };
export function normalizePreparation(value: unknown): Preparation {
  if (!value || typeof value !== 'object') return { ...emptyPreparation, checked: [] };
  const input = value as Partial<Preparation>;
  return { date: typeof input.date === 'string' ? input.date.slice(0, 10) : '', notes: typeof input.notes === 'string' ? input.notes.slice(0, 2000) : '', checked: Array.isArray(input.checked) ? [...new Set(input.checked.filter(id => essentials.some(item => item.id === id)))] : [] };
}
export function validDepartureDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export const trekkingResources = [
  { label: 'NTB · permits, TIMS & guides', url: 'https://ntb.gov.np/plan-your-trip/before-you-come/tims-card' },
  { label: 'DHM · weather & warnings', url: 'https://dhm.gov.np/' },
  { label: 'HRA · altitude advice', url: 'https://himalayanrescue.org/altitude' },
];
