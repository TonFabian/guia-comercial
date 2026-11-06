import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExternalUrl } from './links';

const { platformOS, linkingOpenURL, alertFn } = vi.hoisted(() => ({
  platformOS: { value: 'ios' as string },
  linkingOpenURL: vi.fn(async () => {}),
  alertFn: vi.fn(),
}));

vi.mock('react-native', () => ({
  Linking: { openURL: linkingOpenURL },
  Alert: { alert: alertFn },
  Platform: { get OS() { return platformOS.value; } },
}));

describe('openExternalUrl (nativo)', () => {
  beforeEach(() => {
    platformOS.value = 'ios';
    vi.clearAllMocks();
  });
  afterEach(() => vi.clearAllMocks());

  it('abre URLs http/https via Linking', async () => {
    await openExternalUrl('https://example.com/path', 'título');

    expect(linkingOpenURL).toHaveBeenCalledWith('https://example.com/path');
    expect(alertFn).not.toHaveBeenCalled();
  });

  it('bloqueia javascript:', async () => {
    await openExternalUrl('javascript:alert(1)', 'título');
    expect(linkingOpenURL).not.toHaveBeenCalled();
    expect(alertFn).toHaveBeenCalled();
  });

  it('bloqueia data:', async () => {
    await openExternalUrl('data:text/html,<h1>x</h1>', 'título');
    expect(linkingOpenURL).not.toHaveBeenCalled();
  });

  it('bloqueia file:', async () => {
    await openExternalUrl('file:///etc/passwd', 'título');
    expect(linkingOpenURL).not.toHaveBeenCalled();
  });

  it('bloqueia string que não é URL', async () => {
    await openExternalUrl('not a url', 'título');
    expect(linkingOpenURL).not.toHaveBeenCalled();
    expect(alertFn).toHaveBeenCalled();
  });

  it('bloqueia string vazia', async () => {
    await openExternalUrl('', 'título');
    expect(linkingOpenURL).not.toHaveBeenCalled();
  });
});

describe('openExternalUrl (web)', () => {
  const openMock = vi.fn();

  beforeEach(() => {
    platformOS.value = 'web';
    vi.clearAllMocks();
    vi.stubGlobal('window', { open: openMock });
  });
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('abre via window.open com noopener,noreferrer', async () => {
    await openExternalUrl('https://example.com/path', 'título');

    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/path',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('bloqueia javascript: no web', async () => {
    await openExternalUrl('javascript:alert(1)', 'título');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('bloqueia endereços internos no web', async () => {
    await openExternalUrl('http://127.0.0.1/admin', 'título');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('bloqueia caracteres de controle no web', async () => {
    await openExternalUrl('https://example.com/\njavascript:alert(1)', 'título');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('bloqueia URL acima de 2048 caracteres no web', async () => {
    const longa = 'https://example.com/' + 'a'.repeat(2048);
    await openExternalUrl(longa, 'título');
    expect(openMock).not.toHaveBeenCalled();
  });

  it('abre a URL normalizada no web', async () => {
    await openExternalUrl('HTTPS://Example.COM/Path', 'título');
    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/Path',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
