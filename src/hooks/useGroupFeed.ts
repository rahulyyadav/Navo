import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { decodeCloud, useCloud } from '@/context/CloudContext';
export function useGroupFeed<T>(groupId: string, name: 'members' | 'messages' | 'alerts' | 'checkins' | 'invitations') {
  const { ready } = useCloud();
  const key = `${groupId}/${name}`;
  const [state, setState] = useState<{ key: string; items: T[]; loading: boolean; cached: boolean; error: string }>({ key: '', items: [], loading: true, cached: false, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready || !firestore || !groupId) return;
    const base = collection(firestore, 'groups', groupId, name);
    const feed = name === 'members' ? query(base, limit(50)) : query(base, orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(feed, { includeMetadataChanges: true }, result => setState({ key, items: result.docs.map(item => ({ ...decodeCloud(item.data()) as object, id: item.id }) as T), loading: false, cached: result.metadata.fromCache, error: '' }), () => setState({ key, items: [], loading: false, cached: false, error: 'Could not load this group feed. Check membership and connection, then retry.' }));
  }, [ready, groupId, name, key, retry]);
  return { items: ready && state.key === key ? state.items : [], loading: ready && state.key !== key ? true : ready && state.loading, cached: state.cached, error: state.error, retry: () => setRetry(value => value + 1) };
}
