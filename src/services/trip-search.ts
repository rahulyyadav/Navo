import type { PersonalTrip } from './trip-library';
export function findTrips(trips: PersonalTrip[], search: string, period: string, today: string) {
  const term = search.trim().toLocaleLowerCase();
  return trips.filter(trip => (!term || [trip.name, trip.meeting, trip.origin].some(value => value.toLocaleLowerCase().includes(term))) && (period === 'Upcoming' ? trip.date >= today : period === 'Past' ? trip.date < today : true))
    .sort((a,b) => period === 'Past' ? b.date.localeCompare(a.date) || b.time.localeCompare(a.time) : a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}
