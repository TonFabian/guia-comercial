import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('reviewImageValidatorService.validate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NSFW_ENABLED', 'false');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const toB64 = (b: Buffer) => b.toString('base64');

  it('rejeita input vazio', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    expect((await reviewImageValidatorService.validate('')).ok).toBe(false);
  });

  it('aceita jpeg base64', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(png));
    expect(r.ok).toBe(true);
  });

  it('aceita png base64', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(png));
    expect(r.ok).toBe(true);
  });

  it('aceita gif base64', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(gif));
    expect(r.ok).toBe(true);
  });

  it('aceita webp base64', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(webp));
    expect(r.ok).toBe(true);
  });

  it('rejeita bytes desconhecidos', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(Buffer.from([1, 2, 3, 4])));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unsupported_type');
  });

  it('rejeita data url com mime mismatch', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(`data:image/png;base64,${toB64(jpeg)}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('mime_mismatch');
  });

  it('aceita data url coerente', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(`data:image/jpeg;base64,${toB64(jpeg)}`);
    expect(r.ok).toBe(true);
  });

  it('rejeita url http', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate('https://example.com/a.jpg');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_base64');
  });

  it('rejeita path absoluto', async () => {
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate('/tmp/a.jpg');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_base64');
  });

  it('rejeita muito grande', async () => {
    vi.resetModules();
    vi.stubEnv('REVIEW_IMAGE_MAX_BYTES', '1');
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(png));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_large');
  });

  it('propaga nsfw fail-closed', async () => {
    vi.stubEnv('NSFW_ENABLED', 'true');
    vi.stubEnv('NSFW_API_URL', 'https://nsfw.test/upload');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const { reviewImageValidatorService } = await import('./review-image-validator.service.js');
    const r = await reviewImageValidatorService.validate(toB64(png));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('network_or_timeout');
  });
});