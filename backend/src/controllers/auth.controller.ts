import type { RequestHandler } from 'express';

/** POST /auth/guest: declara a intenção de navegar como convidado. */
export const guestLogin: RequestHandler = (_req, res): void => {
  res.status(200).json({ guest: true });
};
