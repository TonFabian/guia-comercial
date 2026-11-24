import { nsfwModerationService } from './nsfw-moderation.service.js';

const MAX_BYTES = Number(process.env.REVIEW_IMAGE_MAX_BYTES || '5242880');

type ValidateResult = { ok: true; base64: string } | { ok: false; reason: string };

const MAGIC: { bytes: number[]; mask?: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50], mime: 'image/webp' },
];

function detectMime(buf: Buffer): string | null {
  for (const m of MAGIC) {
    if (buf.length < m.bytes.length) continue;
    let ok = true;
    for (let i = 0; i < m.bytes.length; i++) {
      if (m.bytes[i] === -1) continue;
      if (buf[i] !== m.bytes[i]) { ok = false; break; }
    }
    if (ok) return m.mime;
  }
  return null;
}

export async function validate(input: string): Promise<ValidateResult> {
  if (typeof input !== 'string' || input.trim() === '') return { ok: false, reason: 'invalid_input' };

  let declaredMime: string | null = null;
  let payload = input.trim();

  const dataUrlMatch = payload.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    declaredMime = dataUrlMatch[1].toLowerCase();
    payload = dataUrlMatch[2];
  } else if (/^https?:\/\//i.test(payload) || /^[a-z]:[\\/]/i.test(payload) || payload.includes('/') || payload.includes('\\')) {
    // heuristic: looks like path/url
    // but allow pure base64 which has no slashes? base64 may contain / and +. Check below.
  }

  // reject obvious urls/paths
  if (/^(https?:|file:|\/|[a-z]:[\\/])/i.test(payload) && !dataUrlMatch) {
    return { ok: false, reason: 'not_base64' };
  }

  // validate base64
  const clean = payload.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+=*$/.test(clean)) {
    return { ok: false, reason: 'not_base64' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(clean, 'base64');
  } catch {
    return { ok: false, reason: 'not_base64' };
  }
  if (buffer.length === 0) return { ok: false, reason: 'empty' };

  if (buffer.length > MAX_BYTES) return { ok: false, reason: 'too_large' };

  const detected = detectMime(buffer);
  if (!detected) return { ok: false, reason: 'unsupported_type' };

  if (declaredMime && declaredMime !== detected) {
    return { ok: false, reason: 'mime_mismatch' };
  }

  const nsfw = await nsfwModerationService.inspect(buffer);
  if (!nsfw.allowed) return { ok: false, reason: nsfw.reason || 'nsfw_blocked' };

  return { ok: true, base64: clean };
}

export const reviewImageValidatorService = { validate };
export default reviewImageValidatorService;
