import { normalizePreparation, type Preparation } from './preparation';

type Repository = {
  read: () => Promise<unknown>;
  write: (value: { plan: Preparation; pending: boolean }) => Promise<void>;
  fetch: () => Promise<unknown>;
  save: (plan: Preparation) => Promise<unknown>;
};
export type PreparationState = { plan: Preparation; loaded: boolean; status: 'loading' | 'saving' | 'saved' | 'pending'; error: string };

// A durable local outbox, with one cloud write at a time. Later decisions cannot
// be overwritten by an older response, and failed writes remain retryable.
export function createPreparationSync(repo: Repository, publish: (state: PreparationState) => void) {
  let state: PreparationState = { plan: normalizePreparation(null), loaded: false, status: 'loading', error: '' };
  let revision = 0;
  let dirty = false;
  let localQueue = Promise.resolve();
  let syncing: Promise<void> | null = null;
  let loading: Promise<void> | null = null;
  const emit = (patch: Partial<PreparationState>) => { state = { ...state, ...patch }; publish(state); };
  const cache = (plan: Preparation, pending: boolean, version?: number) => {
    const operation = localQueue.then(() => version === undefined || version === revision ? repo.write({ plan, pending }) : undefined);
    localQueue = operation.catch(() => {});
    return operation;
  };
  async function flush() {
    if (syncing) return syncing;
    const run = async () => {
      emit({ status: 'saving', error: '' });
      try {
        while (true) {
          const version = revision; const plan = state.plan;
          await cache(plan, true, version);
          await repo.save(plan);
          if (version !== revision) continue;
          await cache(plan, false, version);
          if (version !== revision) continue;
          dirty = false;
          emit({ status: 'saved', error: '' });
          break;
        }
      } catch {
        emit({ status: 'pending', error: 'Not synced yet. Your changes will stay here; tap Retry to save them to your account.' });
      }
    };
    syncing = run().finally(() => { syncing = null; });
    return syncing;
  }
  async function loadOnce() {
    emit({ loaded: false, status: 'loading', error: '' });
    try {
      const raw = await repo.read();
      const saved = raw && typeof raw === 'object' && 'plan' in raw ? raw as { plan: unknown; pending?: boolean } : null;
      const local = normalizePreparation(saved ? saved.plan : raw);
      const pending = Boolean(saved?.pending || (raw && !saved)); // Migrate legacy device-only checklist.
      emit({ plan: local });
      if (pending) {
        dirty = true;
        emit({ loaded: true });
        await flush();
      } else {
        try {
          const remote = await repo.fetch();
          const plan = remote ? normalizePreparation(remote) : local;
          await cache(plan, false);
          emit({ plan, loaded: true, status: 'saved', error: '' });
        } catch {
          emit({ loaded: Boolean(raw), status: 'pending', error: raw ? 'Could not load your account preparation. Showing the copy on this device. Retry when connected.' : 'Could not load your account preparation. Tap Retry when connected before making choices.' });
        }
      }
    } catch {
      // Do not overwrite a checklist when its local copy could not be read.
      emit({ status: 'pending', error: 'Could not load your preparation. Tap Retry to reopen it.' });
    }
  }
  function load() {
    if (!loading) loading = loadOnce().finally(() => { loading = null; });
    return loading;
  }
  function change(plan: Preparation) {
    if (!state.loaded) return;
    dirty = true;
    revision += 1;
    emit({ plan: normalizePreparation(plan), status: 'saving', error: '' });
    void cache(state.plan, true).catch(() => emit({ status: 'pending', error: 'Device storage is unavailable. Keep this screen open and retry saving.' }));
    void flush();
  }
  return { load, change, retry: () => state.loaded && dirty ? flush() : load() };
}
