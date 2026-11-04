/**
 * Regras puras da busca por voz.
 *
 * A reconhecimento de voz depende do ambiente: na web existe a Web Speech
 * API; no app instalado existe o módulo nativo; no Expo Go não existe
 * nenhum dos dois — e o app precisa avisar o usuário em vez de ficar inerte.
 */

/** Mensagem exibida quando o app está rodando no Expo Go. */
export const VOICE_UNAVAILABLE_EXPO_GO =
  'A busca por voz só funciona no app instalado (dev build). No Expo Go o microfone não está disponível.';

/** Mensagem exibida quando o ambiente não tem reconhecimento de voz. */
export const VOICE_UNAVAILABLE_UNSUPPORTED =
  'Este ambiente não oferece busca por voz. Use o teclado para pesquisar.';

/** Motivo da indisponibilidade da busca por voz. */
export type VoiceUnavailableReason = 'expo-go' | 'sem-suporte';

/** Resultado da análise de disponibilidade. */
export type VoiceSupport = {
  available: boolean;
  reason: VoiceUnavailableReason | null;
  message: string;
};

/** Ambiente analisado para decidir se a busca por voz pode começar. */
export type VoiceEnvironment = {
  platform: string;
  appOwnership: string | null;
  hasWebSpeech: boolean;
  hasNativeModule: boolean;
};

/** Decide se a busca por voz funciona no ambiente atual. */
export function resolveVoiceSupport(environment: VoiceEnvironment): VoiceSupport {
  if (environment.platform === 'web') {
    return environment.hasWebSpeech
      ? { available: true, reason: null, message: '' }
      : { available: false, reason: 'sem-suporte', message: VOICE_UNAVAILABLE_UNSUPPORTED };
  }

  if (environment.appOwnership === 'expo') {
    return { available: false, reason: 'expo-go', message: VOICE_UNAVAILABLE_EXPO_GO };
  }

  return environment.hasNativeModule
    ? { available: true, reason: null, message: '' }
    : { available: false, reason: 'sem-suporte', message: VOICE_UNAVAILABLE_UNSUPPORTED };
}

/** Normaliza o texto transcrito (espaços extras e pontuação no fim). */
export function normalizeTranscript(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:!?]+$/u, '')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Extrai o transcript do resultado da Web Speech API. */
export function extractWebTranscript(event: unknown): string {
  if (!isRecord(event)) return '';
  const results = event.results;
  if (!isRecord(results)) return '';
  const firstResult = results['0'];
  if (!isRecord(firstResult)) return '';
  const alternative = firstResult['0'];
  if (!isRecord(alternative)) return '';
  const transcript = alternative.transcript;
  return normalizeTranscript(typeof transcript === 'string' ? transcript : '');
}

/** Extrai o transcript do evento do módulo nativo de voz. */
export function extractNativeTranscript(event: unknown): string {
  if (!isRecord(event)) return '';
  const value = event.value;
  if (!Array.isArray(value)) return '';
  const first = value.find((item) => typeof item === 'string');
  return normalizeTranscript(typeof first === 'string' ? first : '');
}

/** Traduz o erro do reconhecimento de voz para uma mensagem útil. */
export function describeVoiceError(error: unknown): string {
  const raw = isRecord(error) ? error.error : undefined;
  const code =
    typeof raw === 'string'
      ? raw
      : isRecord(raw) && typeof raw.code === 'string'
        ? raw.code
        : '';

  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permissão de microfone negada. Libere o microfone nas configurações do aparelho.';
    case 'no-speech':
      return 'Não ouvimos nada. Tente falar novamente.';
    case 'network':
      return 'Falha de rede durante o reconhecimento de voz.';
    case 'aborted':
      return 'A busca por voz foi cancelada.';
    default:
      return 'Não foi possível iniciar a busca por voz.';
  }
}
