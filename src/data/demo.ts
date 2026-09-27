export type DayPlan = {
  day: number;
  from: string;
  to: string;
  distance: string;
  duration: string;
  elevation: string;
  status: 'clear' | 'watch';
};

export const samplePlan: DayPlan[] = [
  { day: 1, from: 'Pokhara', to: 'Jhinu Danda', distance: 'Demo segment', duration: '4-5 hr', elevation: '1,780 m', status: 'clear' },
  { day: 2, from: 'Jhinu Danda', to: 'Bamboo', distance: 'Demo segment', duration: '5-6 hr', elevation: '2,310 m', status: 'clear' },
  { day: 3, from: 'Bamboo', to: 'Deurali', distance: 'Demo segment', duration: '5-6 hr', elevation: '3,230 m', status: 'watch' },
];

export const auditChecks = [
  ['Route continuity', 'Passed'],
  ['Daily workload', 'Passed'],
  ['Elevation change', 'Review day 3'],
  ['Source coverage', 'Demo data'],
] as const;
