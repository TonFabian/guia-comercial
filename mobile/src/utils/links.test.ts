import { Alert, Linking } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExternalUrl } from './links';

vi.mock('react-native', () => ({
  Linking: { openURL: vi.fn(async () => {}) },
  Alert: { alert: vi.fn() },
}));

describe('openExternalUrl', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it('abre URLs http/https', async () => {
    await openExternalUrl('https://example.com/path', 'título');

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/path');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('bloqueia javascript:', async () => {
    await openExternalUrl('javascript:alert(1)', 'título');

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('bloqueia data:', async () => {
    await openExternalUrl('data:text/html,<h1>x</h1>', 'título');

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('bloqueia file:', async () => {
    await openExternalUrl('file:///etc/passwd', 'título');

    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('bloqueia string que não é URL', async () => {
    await openExternalUrl('not a url', 'título');

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('bloqueia string vazia', async () => {
    await openExternalUrl('', 'título');

    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
