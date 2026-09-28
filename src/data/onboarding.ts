import type { ExperienceLevel } from '@/types/navo';

export const LEVELS: { id: ExperienceLevel; label: string; detail: string; symbol: string }[] = [
  { id: 'first-timer', label: 'First trek', detail: 'New to multi-day walking', symbol: '◠' },
  { id: 'day-hiker', label: 'Day hiker', detail: 'Comfortable on long day walks', symbol: '◠◠' },
  { id: 'seasoned', label: 'Seasoned', detail: 'Multi-day treks above 3,000 m', symbol: '▲' },
  { id: 'high-altitude', label: 'High altitude', detail: 'Been above 4,500 m before', symbol: '▲▲' },
];

export const GOALS: { id: string; label: string }[] = [
  { id: 'sunrise', label: 'Sunrise viewpoints' },
  { id: 'high-pass', label: 'Cross a high pass' },
  { id: 'quiet', label: 'Quiet, uncrowded trails' },
  { id: 'culture', label: 'Culture & teahouses' },
  { id: 'photo', label: 'Photography' },
  { id: 'first-4000', label: 'My first 4,000 m' },
];

export const MAX_GOALS = 3;

export const levelLabel = (level: ExperienceLevel | null) =>
  LEVELS.find(entry => entry.id === level)?.label ?? 'Not set';

export const goalLabels = (goals: string[]) =>
  goals.map(id => GOALS.find(goal => goal.id === id)?.label ?? id);
