import { describe, expect, it } from 'vitest';

import {
  describeVoiceError,
  extractNativeTranscript,
  extractWebTranscript,
  normalizeTranscript,
  resolveVoiceSupport,
  VOICE_UNAVAILABLE_EXPO_GO,
  VOICE_UNAVAILABLE_UNSUPPORTED,
} from './voice-search';

describe('normalizeTranscript', () => {
  it('remove espaços extras e corta o texto', () => {
    expect(normalizeTranscript('  padeiro   central ')).toBe('padeiro central');
  });

  it('devolve string vazia para valores que não são texto', () => {
    expect(normalizeTranscript(undefined)).toBe('');
    expect(normalizeTranscript(null)).toBe('');
    expect(normalizeTranscript(42)).toBe('');
    expect(normalizeTranscript({ transcript: 'oi' })).toBe('');
  });
});

describe('resolveVoiceSupport', () => {
  it('libera a busca por voz na web quando existe Web Speech API', () => {
    const suporte = resolveVoiceSupport({
      platform: 'web',
      appOwnership: 'expo',
      hasWebSpeech: true,
      hasNativeModule: false,
    });

    expect(suporte.available).toBe(true);
    expect(suporte.reason).toBeNull();
  });

  it('avisa que o navegador não tem suporte na web', () => {
    const suporte = resolveVoiceSupport({
      platform: 'web',
      appOwnership: null,
      hasWebSpeech: false,
      hasNativeModule: false,
    });

    expect(suporte.available).toBe(false);
    expect(suporte.reason).toBe('sem-suporte');
    expect(suporte.message).toBe(VOICE_UNAVAILABLE_UNSUPPORTED);
  });

  it('explica que o Expo Go não tem módulo de voz', () => {
    const suporte = resolveVoiceSupport({
      platform: 'ios',
      appOwnership: 'expo',
      hasWebSpeech: false,
      hasNativeModule: false,
    });

    expect(suporte.available).toBe(false);
    expect(suporte.reason).toBe('expo-go');
    expect(suporte.message).toBe(VOICE_UNAVAILABLE_EXPO_GO);
  });

  it('libera a busca por voz no app instalado', () => {
    const suporte = resolveVoiceSupport({
      platform: 'android',
      appOwnership: 'standalone',
      hasWebSpeech: false,
      hasNativeModule: true,
    });

    expect(suporte.available).toBe(true);
  });

  it('avisa quando o módulo nativo não está disponível', () => {
    const suporte = resolveVoiceSupport({
      platform: 'android',
      appOwnership: 'standalone',
      hasWebSpeech: false,
      hasNativeModule: false,
    });

    expect(suporte.available).toBe(false);
    expect(suporte.reason).toBe('sem-suporte');
  });
});

describe('extractWebTranscript', () => {
  it('lê o transcript do evento da Web Speech API', () => {
    const evento = {
      results: {
        0: { 0: { transcript: '  farmácia  central ' } },
      },
    };

    expect(extractWebTranscript(evento)).toBe('farmácia central');
  });

  it('devolve string vazia quando o evento não tem transcript', () => {
    expect(extractWebTranscript({})).toBe('');
    expect(extractWebTranscript(undefined)).toBe('');
    expect(extractWebTranscript({ results: {} })).toBe('');
  });
});

describe('extractNativeTranscript', () => {
  it('lê o primeiro resultado do módulo nativo', () => {
    expect(extractNativeTranscript({ value: [' posto de combustivel '] })).toBe(
      'posto de combustivel',
    );
  });

  it('devolve string vazia quando não há resultado', () => {
    expect(extractNativeTranscript({ value: [] })).toBe('');
    expect(extractNativeTranscript({})).toBe('');
    expect(extractNativeTranscript(null)).toBe('');
  });
});

describe('describeVoiceError', () => {
  it('avisa quando a permissão de microfone foi negada', () => {
    const mensagem = describeVoiceError({ error: { code: 'not-allowed' } });

    expect(mensagem).toMatch(/microfone/i);
  });

  it('entende o formato de erro da Web Speech API', () => {
    const mensagem = describeVoiceError({ error: 'not-allowed' });

    expect(mensagem).toMatch(/microfone/i);
  });

  it('avisa quando não ouviu nada', () => {
    const mensagem = describeVoiceError({ error: { code: 'no-speech' } });

    expect(mensagem).toMatch(/ouvimos/i);
  });

  it('usa uma mensagem genérica para erros desconhecidos', () => {
    expect(describeVoiceError(undefined)).toBe('Não foi possível iniciar a busca por voz.');
  });
});
