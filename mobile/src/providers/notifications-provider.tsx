import * as Notifications from 'expo-notifications';
import {
  useNavigationContainerRef,
  useRouter,
  useRootNavigationState,
} from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { ehDeepLinkValido } from '@/utils/deep-link';

// Registra o handler de apresentação uma única vez no escopo do módulo.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function extrairUrl(
  response: Notifications.NotificationResponse | null | undefined,
): string | null {
  const url = response?.notification?.request?.content?.data?.url;
  return typeof url === 'string' ? url : null;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const rootState = useRootNavigationState();
  const isReady = !!rootState;

  const handledIds = useRef<Set<string>>(new Set());
  const pendingUrl = useRef<string | null>(null);

  const tratarResposta = (
    response: Notifications.NotificationResponse | null | undefined,
  ) => {
    const url = extrairUrl(response);
    if (!url) return;
    const id =
      response?.notification?.request?.identifier ?? url;
    if (handledIds.current.has(id)) return;

    if (!ehDeepLinkValido(url)) {
      if (__DEV__) console.warn('[push] deep link fora da whitelist:', url);
      handledIds.current.add(id);
      return;
    }

    handledIds.current.add(id);
    const pronto = navigationRef?.isReady?.() ?? isReady;
    if (pronto) {
      router.push(url as never);
    } else {
      pendingUrl.current = url;
    }
  };

  // Cold start: consulta a última resposta de notificação uma única vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (cancelled) return;
      tratarResposta(response);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener para taps enquanto o app está rodando.
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        tratarResposta(response);
      });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook equivalente (cobertura de export / cold start reativo).
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    tratarResposta(lastResponse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResponse]);

  // Flush do deep link pendente quando o navegador fica pronto.
  useEffect(() => {
    if (isReady && pendingUrl.current) {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      router.push(url as never);
    }
  }, [isReady, router]);

  return <>{children}</>;
}