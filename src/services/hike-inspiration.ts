/** Device-local, daytime prompts; never weather advice or trail clearance. */
export const hikeInspiration = [
  'A little fresh air? Plan a hike with your crew and check the forecast before leaving.',
  'Make room for a slower day. Find a trail, choose your pace and invite a friend.',
  'Your next adventure can start nearby. Explore a day hike and prepare your essentials.',
  'Take a break outdoors. Pick a destination and agree on a return time with your crew.',
];
export function inspirationDates(now = new Date()) {
  const next = new Date(now); next.setHours(9, 0, 0, 0);
  next.setDate(next.getDate() + (6 - next.getDay() + 7) % 7);
  if (next <= now) next.setDate(next.getDate() + 7);
  return Array.from({ length: 4 }, (_, index) => { const date = new Date(next); date.setDate(date.getDate() + index * 7); return date; });
}
