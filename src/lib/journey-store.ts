import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeItinerary, decodeLegs, toJourneyPoint, validPoint, validDate, type PersonalJourney, type JourneyLibrary, type JourneyPreferences } from '@/services/journeys/types';
import { requestJourneyAPI } from '@/lib/api';
const queues = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();
const key = (uid: string) => { if (!uid)
    throw new Error('Sign in to save your journey.'); return `navo:journeys:v1:${uid}`; };
const deletedKey = (uid: string) => `${key(uid)}:deleted`;
export const emptyJourneys = (): JourneyLibrary => ({ version: 1, activeId: null, journeys: [] });
function decode(raw: string | null): JourneyLibrary {
    if (!raw)
        return emptyJourneys();
    const v = JSON.parse(raw) as JourneyLibrary;
    if (v.version !== 1 || !Array.isArray(v.journeys) || v.journeys.length > 40 || new Set(v.journeys.map(j => j.id)).size !== v.journeys.length || v.activeId !== null && !v.journeys.some(j => j.id === v.activeId))
        throw new Error('Saved journeys could not be read. Your data has been kept.');
    for (const j of v.journeys) {
        decodeItinerary(j.template);
        decodeLegs(j.approach, j.approachSources);
        if (j.version !== 1 || typeof j.id !== 'string' || !validPoint(j.preferences?.origin) || !validDate(j.preferences.startDate) || typeof j.preferences.budget !== 'string' || !['draft', 'ready', 'travelling', 'paused', 'completed'].includes(j.phase) || !Number.isInteger(j.completed) || j.completed < 0 || j.completed > j.approach.length + j.template.legs.length || !j.selections || typeof j.selections !== 'object')
            throw new Error('Saved journey is incomplete. Your data has been kept.');
        j.preferences.origin = toJourneyPoint(j.preferences.origin);
        const allLegs = [...j.approach, ...j.template.legs];
        if (new Set(allLegs.map(leg => leg.id)).size !== allLegs.length) throw new Error('Journey stages have duplicate identifiers. Your data has been kept.');
        for (const leg of allLegs)
            if (j.selections[leg.id] && !leg.options.some(o => o.id === j.selections[leg.id]))
                throw new Error('A saved transport option is unavailable.');
    }
    return v;
}
export async function readJourneys(uid: string, onAvailability?: (available: boolean) => void) {
    const local = decode(await AsyncStorage.getItem(key(uid)));
    const tombstones = new Set(JSON.parse(await AsyncStorage.getItem(deletedKey(uid)) ?? '[]') as string[]);
    try {
        const remote = decode(JSON.stringify(await requestJourneyAPI<JourneyLibrary>('/journeys', undefined, 'GET')));
        const byId = new Map(remote.journeys.filter(journey => !tombstones.has(journey.id)).map(journey => [journey.id, journey]));
        for (const journey of local.journeys) {
            const saved = byId.get(journey.id);
            if (!saved || journey.updatedAt > saved.updatedAt) byId.set(journey.id, journey);
        }
        const merged: JourneyLibrary = { version: 1, activeId: local.activeId && byId.has(local.activeId) ? local.activeId : remote.activeId, journeys: [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 40) };
        const raw = JSON.stringify(merged);
        await AsyncStorage.setItem(key(uid), raw);
        if (JSON.stringify(remote) !== raw) {
            try { await requestJourneyAPI<JourneyLibrary>('/journeys', merged, 'PUT'); } catch { /* Keep offline edits in the cache and retry on the next sync. */ }
        }
        if (tombstones.size) {
            const remaining = new Set(tombstones);
            await Promise.all([...tombstones].map(async id => { try { await requestJourneyAPI(`/journeys/${id}`, undefined, 'DELETE'); remaining.delete(id); } catch { /* Retry the deletion on next open. */ } }));
            await AsyncStorage.setItem(deletedKey(uid), JSON.stringify([...remaining]));
        }
        onAvailability?.(true);
        return merged;
    }
    catch {
        onAvailability?.(false);
        // Firestore is the source of truth when online; the device cache remains usable offline.
        return local;
    }
}
export function subscribeJourneys(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function changeJourneys(uid: string, mutate: (value: JourneyLibrary) => JourneyLibrary, persist?: (value: JourneyLibrary) => Promise<unknown>) {
    const task = (queues.get(uid) ?? Promise.resolve()).catch(() => undefined).then(async () => {
        const previous = await readJourneys(uid);
        const next = mutate(previous);
        const raw = JSON.stringify(next);
        if (raw.length > 3000000)
            throw new Error('Journey storage is full. Remove an older journey first.');
        decode(raw);
        // A confirmed edit must reach the authenticated API before the cache or UI changes.
        if (persist) await persist(next);
        await AsyncStorage.setItem(key(uid), raw);
        const removed = previous.journeys.filter(journey => !next.journeys.some(item => item.id === journey.id)).map(journey => journey.id);
        if (removed.length) {
            const pending = new Set([...JSON.parse(await AsyncStorage.getItem(deletedKey(uid)) ?? '[]') as string[], ...removed]);
            await AsyncStorage.setItem(deletedKey(uid), JSON.stringify([...pending]));
            for (const id of removed) {
                try { await requestJourneyAPI(`/journeys/${id}`, undefined, 'DELETE'); pending.delete(id); } catch { /* Preserve tombstones while offline. */ }
            }
            await AsyncStorage.setItem(deletedKey(uid), JSON.stringify([...pending]));
        }
        listeners.forEach(fn => fn());
        return next;
    });
    queues.set(uid, task);
    void task.finally(() => { if (queues.get(uid) === task)
        queues.delete(uid); }).catch(() => undefined);
    return task;
}
export function saveJourney(uid: string, journey: PersonalJourney) {
    const saving = changeJourneys(uid, v => {
        if (!v.journeys.some(j => j.id === journey.id) && v.journeys.length >= 40)
            throw new Error('Your library holds 40 journeys. Remove an older journey first.');
        return { ...v, activeId: journey.id, journeys: [journey, ...v.journeys.filter(j => j.id !== journey.id).map(j => j.phase === 'travelling' ? { ...j, phase: 'paused' as const } : j)] };
    });
    return saving.then(async library => {
        await requestJourneyAPI(`/journeys/${journey.id}`, journey, 'PUT');
        return library;
    });
}
export function editJourney(uid: string, id: string, edit: (value: PersonalJourney) => PersonalJourney) {
    return changeJourneys(uid, v => {
        if (!v.journeys.some(j => j.id === id)) throw new Error('This journey is no longer available. Reopen your journeys.');
        return { ...v, journeys: v.journeys.map(j => j.id === id ? { ...edit(j), updatedAt: new Date().toISOString() } : j) };
    }, value => requestJourneyAPI(`/journeys/${id}`, value.journeys.find(j => j.id === id), 'PUT'));
}
export async function readJourneyDraft(uid: string, destinationId: string): Promise<Partial<JourneyPreferences> | null> {
    const raw = await AsyncStorage.getItem(`${key(uid)}:draft:${destinationId}`);
    if (!raw)
        return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    return {
        ...(validPoint(v.origin) ? { origin: toJourneyPoint(v.origin) } : {}),
        ...(typeof v.startDate === 'string' && v.startDate.length <= 10 ? { startDate: v.startDate } : {}),
        ...(typeof v.finishDate === 'string' && v.finishDate.length <= 10 ? { finishDate: v.finishDate } : {}),
        ...(typeof v.budget === 'string' && v.budget.length <= 12 ? { budget: v.budget } : {}),
        currency: 'NPR',
    };
}
export function saveJourneyDraft(uid: string, destinationId: string, preferences: Partial<JourneyPreferences>) {
    return AsyncStorage.setItem(`${key(uid)}:draft:${destinationId}`, JSON.stringify(preferences));
}
export function clearJourneys(uid: string) {
    const task = (queues.get(uid) ?? Promise.resolve()).catch(() => undefined).then(async () => {
        const prefix = key(uid);
        const keys = await AsyncStorage.getAllKeys();
        await AsyncStorage.multiRemove(keys.filter(k => k === prefix || k.startsWith(prefix + ':draft:')));
        listeners.forEach(fn => fn());
    });
    queues.set(uid, task);
    void task.finally(() => { if (queues.get(uid) === task)
        queues.delete(uid); }).catch(() => undefined);
    return task;
}
