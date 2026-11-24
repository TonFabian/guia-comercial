import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Dispara `onReload` quando o app retorna do segundo plano
 * (`background`/`inactive` → `active`). Não dispara no mount inicial, que já
 * executa o carregamento inicial da tela.
 *
 * O callback é guardado em ref para não recriar a subscrição a cada render.
 */
export function useReloadOnAppActive(onReload: () => void): void {
  const onReloadRef = useRef(onReload);
  useEffect(() => {
    onReloadRef.current = onReload;
  });

  const estadoAnterior = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (proximoEstado) => {
      const estavaEmBackground =
        estadoAnterior.current === 'background' ||
        estadoAnterior.current === 'inactive';
      estadoAnterior.current = proximoEstado;
      if (proximoEstado === 'active' && estavaEmBackground) {
        onReloadRef.current();
      }
    });
    return () => subscription.remove();
  }, []);
}