import { useEffect } from 'react';
import { router } from 'expo-router';

import { useAuthState } from '@/providers/auth-provider';

/**
 * Guarda de rota da área autenticada: sem sessão e sem modo convidado,
 * vai para o sign-in. Chamado no layout de `(tabs)`.
 */
export function useAuthGuard(): void {
  const { state } = useAuthState();

  useEffect(() => {
    if (state === 'signedOut') {
      router.replace('/(auth)/sign-in');
    }
  }, [state]);
}
