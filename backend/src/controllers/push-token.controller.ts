import type { Request, Response } from 'express';

import { assertAdmin } from '../services/user.service.js';
import { listAllPushTokens, upsertPushToken } from '../services/push-token.service.js';
import type { BroadcastDto, PushTokenDto } from '../types/dto.js';

export async function registerPushToken(req: Request, res: Response): Promise<void> {
  // O `validateBody` (zod) garantiu `token` string simples e descartou chaves
  // desconhecidas — um `clerkId` forjado no body jamais chega aqui.
  const { token } = req.body as PushTokenDto;
  // A identidade (quando existir) vem da sessão do Clerk — nunca do body.
  await upsertPushToken(token, req.auth?.clerkId);
  res.json({ ok: true });
}

export async function broadcastPush(req: Request, res: Response): Promise<void> {
  // Fail-closed: sem nenhum mecanismo de proteção configurado, não transmitir.
  // As checagens de admin/secret precedem qualquer uso de title/body.
  if (!process.env.CLERK_SECRET_KEY && !process.env.NOTIFY_SECRET) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (process.env.CLERK_SECRET_KEY) {
    if (!req.auth?.clerkId) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    await assertAdmin(req.auth.clerkId, 'broadcast de notificações');
  }

  const secret = process.env.NOTIFY_SECRET;
  if (secret && req.headers['x-notify-secret'] !== secret) {
    res.status(403).json({ error: 'Não autorizado' });
    return;
  }

  // title/body já validados e limitados pelo `broadcastSchema` (zod).
  const { title, body } = req.body as BroadcastDto;
  const tokens = await listAllPushTokens();
  if (tokens.length === 0) {
    res.json({ sent: 0 });
    return;
  }
  const messages = tokens.map((to) => ({ to, title, body: body ?? '' }));
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const data = await response.json();
    res.json({ sent: tokens.length, result: data });
  } catch {
    res.status(500).json({ error: 'Falha ao enviar notificações' });
  }
}
