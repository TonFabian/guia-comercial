import { Request, Response } from 'express';

import { asyncHandler } from '../utils/http.js';
import { getRedis } from '../config/redis.js';

export const health = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const redis = getRedis();

  let redisStatus: 'up' | 'down' = 'down';

  if (redis) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis ping timeout')), 1000);
      });
      await Promise.race([redis.ping(), timeout]);
      redisStatus = 'up';
    } catch {
      redisStatus = 'down';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  res.json({ status: 'ok', timestamp: new Date().toISOString(), redis: redisStatus });
});
