import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useFirebaseAuth } from '@/context/AuthContext';
import { useCloud } from '@/context/CloudContext';
import { readInbox, saveInbox, type InboxCache } from '@/lib/inbox-cache';
export function useInbox() {
  const { user } = useFirebaseAuth(); const cloud = useCloud(); const uid = user?.uid ?? '';
  const [stored, setStored] = useState<{ uid: string; data: InboxCache | null; error: string }>({ uid: '', data: null, error: '' });
  useFocusEffect(useCallback(() => {
    if (!uid) return;
    let active = true;
    void readInbox(uid).then(data => { if (active) setStored({ uid, data, error: '' }); }).catch(() => { if (active) setStored({ uid, data: null, error: 'Saved inbox unavailable. Reconnect to load your latest updates.' }); });
    return () => { active = false; };
  }, [uid]));
  const live = cloud.ready && cloud.notificationsLoaded && !cloud.notificationsCached;
  useEffect(() => {
    if (!uid || !live) return;
    let active = true;
    void saveInbox(uid, cloud.notifications).then(data => { if (active) setStored({ uid, data, error: '' }); }).catch(() => { if (active) setStored(current => ({ uid, data: current.uid === uid ? current.data : null, error: 'Updates loaded, but could not be saved for offline use. Check device storage.' })); });
    return () => { active = false; };
  }, [uid, live, cloud.notifications]);
  const data = stored.uid === uid ? stored.data : null;
  return { items: live || (cloud.ready && cloud.notificationsLoaded) ? cloud.notifications : data?.items ?? [], cached: !live, savedAt: data?.savedAt, loading: !cloud.notificationsLoaded && !data && cloud.ready, error: stored.uid === uid ? stored.error : '', live };
}
