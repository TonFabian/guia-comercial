import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Pré-aquece o browser de autenticação no Android (evita Cold shorten de
 * Custom Tab no primeiro login) e libera no desmonte.
 */
export function useWarmUpBrowser(): void {
  useEffect(() => {
    if (Platform.OS === 'android') {
      void WebBrowser.warmUpAsync();
    }

    return () => {
      if (Platform.OS === 'android') {
        void WebBrowser.coolDownAsync();
      }
    };
  }, []);
}
