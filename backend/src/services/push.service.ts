import { Types, isValidObjectId } from 'mongoose';

import { PushTokenModel } from '../models/push-token.model.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushTicketOk {
  status: 'ok';
  id: string;
}

export interface PushTicketErro {
  status: 'error';
  message: string;
  details?: { error?: string };
}

export type PushTicket = PushTicketOk | PushTicketErro;

const TAMANHO_LOTE = 100;

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  opcoes?: { data?: Record<string, string>; image?: string },
): Promise<{ tickets: PushTicket[]; mortos: string[] }> {
  const tickets: PushTicket[] = [];
  const mortos: string[] = [];

  if (tokens.length === 0) return { tickets, mortos };

  const { data, image } = opcoes ?? {};

  for (let inicio = 0; inicio < tokens.length; inicio += TAMANHO_LOTE) {
    const lote = tokens.slice(inicio, inicio + TAMANHO_LOTE);
    const mensagens = lote.map((to) => ({
      to,
      title,
      body,
      ...(data ? { data } : {}),
      ...(image ? { image } : {}),
    }));

    try {
      const resposta = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mensagens),
      });

      const statusHttp = typeof resposta.status === 'number' ? resposta.status : 200;
      const ok = typeof resposta.ok === 'boolean' ? resposta.ok : statusHttp >= 200 && statusHttp < 300;

      if (!ok || statusHttp < 200 || statusHttp >= 300) {
        console.warn(`[push] API do Expo respondeu ${statusHttp} para ${lote.length} mensagem(ns)`);
        for (let indice = 0; indice < lote.length; indice++) {
          tickets.push({ status: 'error', message: `HTTP ${statusHttp}`, details: undefined });
        }
        continue;
      }

      let json: unknown;
      try {
        json = typeof resposta.json === 'function' ? await resposta.json() : resposta;
      } catch (erro) {
        console.warn('[push] resposta inválida da API do Expo:', erro instanceof Error ? erro.message : erro);
        for (let indice = 0; indice < lote.length; indice++) {
          tickets.push({ status: 'error', message: 'resposta inválida', details: undefined });
        }
        continue;
      }

      const dados = (json as { data?: unknown })?.data;
      const listaTickets = Array.isArray(dados) ? dados : [];

      for (let indice = 0; indice < lote.length; indice++) {
        const ticketBruto = listaTickets[indice];
        if (!ticketBruto || typeof ticketBruto !== 'object') {
          tickets.push({ status: 'error', message: 'ticket inválido', details: undefined });
          continue;
        }

        const ticket = ticketBruto as {
          status?: string;
          id?: string;
          message?: string;
          details?: { error?: string };
        };

        if (ticket.status === 'ok') {
          tickets.push({ status: 'ok', id: String(ticket.id ?? '') });
        } else {
          tickets.push({
            status: 'error',
            message: String(ticket.message ?? ''),
            details: ticket.details,
          });

          if (ticket.details?.error === 'DeviceNotRegistered') {
            try {
              const resultado = await PushTokenModel.deleteOne({ token: lote[indice] });
              const removidos = (resultado as { deletedCount?: number })?.deletedCount ?? 0;
              if (removidos > 0) mortos.push(lote[indice]);
            } catch (erro) {
              console.warn('[push] falha ao remover token morto:', erro instanceof Error ? erro.message : erro);
            }
          }
        }
      }
    } catch (erro) {
      console.warn('[push] falha de rede ao enviar notificações:', erro instanceof Error ? erro.message : erro);
       for (let indice = 0; indice < lote.length; indice++) {
         tickets.push({ status: 'error', message: 'falha de rede', details: undefined });
       }
    }
  }

  return { tickets, mortos };
}

export async function sendPushToUser(clerkId: string, title: string, body: string): Promise<void> {
  const docs = await PushTokenModel.find({ clerkId })
    .select({ token: 1 })
    .lean<{ token?: string }[]>()
    .exec();
  await sendPushToTokens(
    docs.map((d) => d.token).filter((t): t is string => typeof t === 'string'),
    title,
    body,
  );
}

export async function sendPushToCity(cityId: string, title: string, body: string): Promise<void> {
  if (!isValidObjectId(cityId)) return;
  const docs = await PushTokenModel.aggregate<{ token: string }>([
    { $match: { clerkId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: 'clerkId',
        foreignField: 'clerkId',
        as: 'usuario',
      },
    },
    { $unwind: '$usuario' },
    { $match: { 'usuario.city': new Types.ObjectId(cityId) } },
    { $project: { token: 1, _id: 0 } },
  ]).exec();
  await sendPushToTokens(docs.map((d) => d.token), title, body);
}
