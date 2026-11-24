import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('nsfwModerationService.inspect', () => {
  beforeEach(() => {
    vi.stubEnv('NSFW_ENABLED', 'true');
    vi.stubEnv('NSFW_API_URL', 'https://nsfw.test/upload');
    vi.stubEnv('NSFW_TIMEOUT_MS', '1000');
    vi.unstubAllEnvs();
    vi.stubEnv('NSFW_ENABLED', 'true');
    vi.stubEnv('NSFW_API_URL', 'https://nsfw.test/upload');
    vi.stubEnv('NSFW_TIMEOUT_MS', '1000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('limpa passa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'OK', data: { nsfw: false, porn: false } }), { status: 200 })));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect(await nsfwModerationService.inspect(Buffer.from('x'))).toEqual({ allowed: true });
  });

  it('nsfw true rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'OK', data: { nsfw: true, porn: false } }), { status: 200 })));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    const r = await nsfwModerationService.inspect(Buffer.from('x'));
    expect(r.allowed).toBe(false);
  });

  it('ERR rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ERR' }), { status: 200 })));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect((await nsfwModerationService.inspect(Buffer.from('x'))).allowed).toBe(false);
  });

  it('NOQUOTA rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'NOQUOTA' }), { status: 200 })));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect((await nsfwModerationService.inspect(Buffer.from('x'))).allowed).toBe(false);
  });

  it('rede rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect((await nsfwModerationService.inspect(Buffer.from('x'))).allowed).toBe(false);
  });

  it('json invalido rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })));
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect((await nsfwModerationService.inspect(Buffer.from('x'))).allowed).toBe(false);
  });

  it('NSFW_ENABLED=false passa', async () => {
    vi.stubEnv('NSFW_ENABLED', 'false');
    const { nsfwModerationService } = await import('./nsfw-moderation.service.js');
    expect(await nsfwModerationService.inspect(Buffer.from('x'))).toEqual({ allowed: true });
  });
});
