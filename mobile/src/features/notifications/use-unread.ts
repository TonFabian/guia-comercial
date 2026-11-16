import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getUnreadCount } from '@/services/api';

export function useUnread() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    const n = await getUnreadCount();
    setCount(n);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { count, refresh };
}
