const logger = { warn: (m: string) => console.warn(m) };

const DEFAULT_URL = 'https://nsfw-categorize.it/api/upload';

function bootWarn() {
  if (process.env.NSFW_ENABLED === 'false') {
    logger.warn('NSFW moderation disabled (dev only)');
    return;
  }
  if (!process.env.NSFW_API_URL) {
    logger.warn('NSFW_API_URL ausente com NSFW_ENABLED=true — fail-closed');
  }
}

bootWarn();

export async function inspect(buffer: Buffer): Promise<{ allowed: boolean; reason?: string }> {
  if (process.env.NSFW_ENABLED === 'false') {
    return { allowed: true };
  }

  if (process.env.NSFW_ENABLED === 'true' && !process.env.NSFW_API_URL) {
    return { allowed: false, reason: 'nsfw_config_missing' };
  }

  const url = process.env.NSFW_API_URL || DEFAULT_URL;
  const timeout = Number(process.env.NSFW_TIMEOUT_MS || '10000');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' });
    form.append('image', blob, 'image.jpg');

    const headers: Record<string, string> = {};
    if (process.env.NSFW_API_KEY) headers['NSFWKEY'] = process.env.NSFW_API_KEY;

    const res = await fetch(url, { method: 'POST', body: form, headers, signal: controller.signal });
    let json: any;
    try {
      json = await res.json();
    } catch {
      return { allowed: false, reason: 'invalid_json' };
    }

    if (json?.status === 'ERR' || json?.status === 'NOQUOTA') {
      return { allowed: false, reason: json.status };
    }
    if (json?.status !== 'OK') {
      return { allowed: false, reason: 'bad_status' };
    }
    const data = json?.data || {};
    if (data.nsfw === true || data.porn === true) {
      return { allowed: false, reason: 'nsfw_content' };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: false, reason: 'network_or_timeout' };
  } finally {
    clearTimeout(timer);
  }
}

export const nsfwModerationService = { inspect };
export default nsfwModerationService;
