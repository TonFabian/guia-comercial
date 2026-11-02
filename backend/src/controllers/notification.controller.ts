import type { Request, Response } from 'express';

import { listPushTokens } from '../services/user.service.js';

export async function broadcastNotification(req: Request, res: Response): Promise<void> {
  // Proteção simples: em produção, exige segredo via env NOTIFY_SECRET.
  const secret = process.env.NOTIFY_SECRET;
  if (secret && req.headers['x-notify-secret'] !== secret) {
    res.status(403).json({ error: 'Não autorizado' });
    return;
  }

  const { title, body } = req.body as { title?: string; body?: string };
  if (!title) {
    res.status(400).json({ error: 'title é obrigatório' });
    return;
  }

  const tokens = await listPushTokens();
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