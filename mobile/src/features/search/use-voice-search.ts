import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import {
  describeVoiceError,
  extractNativeTranscript,
  extractWebTranscript,
  resolveVoiceSupport,
  VOICE_UNAVAILABLE_UNSUPPORTED,
} from './voice-search';

/** Reconhecimento de voz da web (Web Speech API), reduzido ao que o app usa. */
type WebRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type WebRecognitionConstructor = new () => WebRecognition;

/** Módulo nativo de voz (@react-native-voice/voice), presente no dev build. */
type NativeVoice = {
  onSpeechResults: (event: unknown) => void;
  onSpeechError: (event: unknown) => void;
  onSpeechEnd: () => void;
  start: (locale: string) => Promise<unknown>;
  stop: () => Promise<unknown>;
};

/** Estado devolvido pelo hook de busca por voz. */
export type VoiceSearch = {
  /** O microfone está em uso. */
  listening: boolean;
  /** Último erro, com mensagem pronta para o usuário. */
  error: string | null;
  /** Tenta iniciar o reconhecimento de voz. */
  start: () => void;
};

/** Construtor da Web Speech API, quando o navegador oferece. */
function getWebRecognitionConstructor(): WebRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as Record<string, unknown>;
  const constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return typeof constructor === 'function' ? (constructor as WebRecognitionConstructor) : null;
}

/**
 * Carrega o módulo nativo de voz. No Expo Go o módulo não existe e a
 * importação falha — nesse caso a busca por voz simplesmente não funciona.
 * O require é tardio de propósito: carregar o pacote no topo do arquivo
 * quebraria o app (e a web) em ambiente sem o módulo nativo.
 */
function loadNativeVoice(): NativeVoice | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-voice/voice') as { default?: NativeVoice };
    return module.default ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca por voz reutilizável (Home e tela de Busca).
 *
 * O hook nunca quebra o app: quando o ambiente não oferece reconhecimento de
 * voz (Expo Go, navegador sem suporte), ele informa o usuário em vez de
 * ficar inerte.
 */
export function useVoiceSearch(onTranscript: (transcript: string) => void): VoiceSearch {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef(onTranscript);

  useEffect(() => {
    handlerRef.current = onTranscript;
  }, [onTranscript]);

  const start = useCallback(() => {
    setError(null);

    // Na web o módulo nativo não existe (e nem deve ser carregado).
    const nativeVoice = Platform.OS === 'web' ? null : loadNativeVoice();
    const support = resolveVoiceSupport({
      platform: Platform.OS,
      appOwnership: Constants.appOwnership ?? null,
      hasWebSpeech: getWebRecognitionConstructor() !== null,
      hasNativeModule: nativeVoice !== null,
    });

    if (!support.available) {
      setError(support.message);
      Alert.alert('Busca por voz', support.message);
      return;
    }

    if (Platform.OS === 'web') {
      const Recognition = getWebRecognitionConstructor();
      if (!Recognition) {
        setError(VOICE_UNAVAILABLE_UNSUPPORTED);
        Alert.alert('Busca por voz', VOICE_UNAVAILABLE_UNSUPPORTED);
        return;
      }

      const recognition = new Recognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: unknown) => {
        setListening(false);
        const transcript = extractWebTranscript(event);
        if (transcript) handlerRef.current(transcript);
      };
      recognition.onerror = (event: unknown) => {
        setListening(false);
        const message = describeVoiceError(event);
        setError(message);
        Alert.alert('Busca por voz', message);
      };
      recognition.onend = () => setListening(false);

      setListening(true);
      try {
        recognition.start();
      } catch {
        setListening(false);
        setError('Não foi possível iniciar a busca por voz.');
      }
      return;
    }

    if (!nativeVoice) {
      setError(VOICE_UNAVAILABLE_UNSUPPORTED);
      Alert.alert('Busca por voz', VOICE_UNAVAILABLE_UNSUPPORTED);
      return;
    }

    nativeVoice.onSpeechResults = (event: unknown) => {
      setListening(false);
      const transcript = extractNativeTranscript(event);
      if (transcript) handlerRef.current(transcript);
    };
    nativeVoice.onSpeechError = (event: unknown) => {
      setListening(false);
      const message = describeVoiceError(event);
      setError(message);
      Alert.alert('Busca por voz', message);
    };
    nativeVoice.onSpeechEnd = () => setListening(false);

    setListening(true);
    nativeVoice.start('pt-BR').catch(() => {
      setListening(false);
      setError('Não foi possível iniciar a busca por voz.');
    });
  }, []);

  return { listening, error, start };
}
