import { Types, isValidObjectId } from 'mongoose';

import type { PushCampaignSegment } from '../../../shared/domain.js';
import { PushCampaignModel } from '../models/push-campaign.model.js';
import { sendPushToTokens } from './push.service.js';
import { CompanyModel } from '../models/company.model.js';
import { PushTokenModel } from '../models/push-token.model.js';
import { UserModel } from '../models/user.model.js';

interface TokenComDono {
  token: string;
  clerkId?: string;
}

interface UsuarioComPreferencia {
  clerkId?: string;
  preferences?: { notifications?: boolean };
}

function clerkIdsUnicos(valores: Array<string | undefined | null>): string[] {
  return [...new Set(valores.filter((valor): valor is string => typeof valor === 'string' && valor.length > 0))];
}

function conjuntoOptOut(usuarios: UsuarioComPreferencia[]): Set<string> {
  const conjunto = new Set<string>();
  for (const usuario of usuarios) {
    if (usuario.preferences?.notifications === false && typeof usuario.clerkId === 'string') {
      conjunto.add(usuario.clerkId);
    }
  }
  return conjunto;
}

export async function resolverSegmento(
  segment: PushCampaignSegment,
): Promise<{ tokens: string[]; targeted: number }> {
  switch (segment.kind) {
    case 'broadcast': {
      const todos = (await PushTokenModel.find({})
        .select({ token: 1, clerkId: 1 })
        .lean()
        .exec()) as TokenComDono[];

      const clerkIds = clerkIdsUnicos(todos.map((documento) => documento.clerkId));
      const usuarios = clerkIds.length
        ? ((await UserModel.find({ clerkId: { $in: clerkIds } })
            .select({ clerkId: 1, preferences: 1 })
            .lean()
            .exec()) as UsuarioComPreferencia[])
        : [];
      const optOut = conjuntoOptOut(usuarios);

      const tokensAntes = todos.map((documento) => documento.token);
      const tokensDepois = todos
        .filter((documento) => !documento.clerkId || !optOut.has(documento.clerkId))
        .map((documento) => documento.token);

      return { tokens: [...new Set(tokensDepois)], targeted: tokensAntes.length };
    }

    case 'user':
    case 'users': {
      const userIds = segment.userIds ?? [];
      const usuarios = userIds.length
        ? ((await UserModel.find({ _id: { $in: userIds } })
            .select({ clerkId: 1, preferences: 1 })
            .lean()
            .exec()) as UsuarioComPreferencia[])
        : [];

      const usuariosAtivos = usuarios.filter((usuario) => usuario.preferences?.notifications !== false);
      const clerkIds = clerkIdsUnicos(usuariosAtivos.map((usuario) => usuario.clerkId));

      const tokensDocs = clerkIds.length
        ? ((await PushTokenModel.find({ clerkId: { $in: clerkIds } })
            .select({ token: 1, clerkId: 1 })
            .lean()
            .exec()) as TokenComDono[])
        : [];

      const tokens = tokensDocs.map((documento) => documento.token);
      return { tokens: [...new Set(tokens)], targeted: tokens.length };
    }

    case 'city': {
      const cityId = segment.cityId;
      if (!cityId || !isValidObjectId(cityId)) {
        return { tokens: [], targeted: 0 };
      }

      const agregados = (await PushTokenModel.aggregate([
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
        { $project: { token: 1, clerkId: 1, _id: 0 } },
      ]).exec()) as TokenComDono[];

      const clerkIds = clerkIdsUnicos(agregados.map((documento) => documento.clerkId));
      const usuarios = clerkIds.length
        ? ((await UserModel.find({ clerkId: { $in: clerkIds } })
            .select({ clerkId: 1, preferences: 1 })
            .lean()
            .exec()) as UsuarioComPreferencia[])
        : [];
      const optOut = conjuntoOptOut(usuarios);

      const tokensFiltrados = agregados
        .filter((documento) => !optOut.has(documento.clerkId ?? ''))
        .map((documento) => documento.token);

      return { tokens: [...new Set(tokensFiltrados)], targeted: tokensFiltrados.length };
    }

    case 'plan': {
      const plan = segment.plan;
      if (!plan) return { tokens: [], targeted: 0 };

      const empresas = (await CompanyModel.find({ plan })
        .select({ ownerClerkId: 1 })
        .lean()
        .exec()) as Array<{ ownerClerkId?: string }>;

      const todosClerkIds = clerkIdsUnicos(empresas.map((empresa) => empresa.ownerClerkId));

      const usuarios = todosClerkIds.length
        ? ((await UserModel.find({ clerkId: { $in: todosClerkIds } })
            .select({ clerkId: 1, preferences: 1 })
            .lean()
            .exec()) as UsuarioComPreferencia[])
        : [];
      const optOut = conjuntoOptOut(usuarios);

      const clerkIdsAtivos = todosClerkIds.filter((clerkId) => !optOut.has(clerkId));

      const tokensDocs = clerkIdsAtivos.length
        ? ((await PushTokenModel.find({ clerkId: { $in: clerkIdsAtivos } })
            .select({ token: 1, clerkId: 1 })
            .lean()
            .exec()) as TokenComDono[])
        : [];

      const tokens = tokensDocs.map((documento) => documento.token);
      return { tokens: [...new Set(tokens)], targeted: tokens.length };
    }

    case 'favorites': {
      const companyId = segment.companyId;
      if (!companyId) return { tokens: [], targeted: 0 };

      const usuarios = (await UserModel.find({ favorites: companyId })
        .select({ clerkId: 1, preferences: 1 })
        .lean()
        .exec()) as UsuarioComPreferencia[];

      const usuariosAtivos = usuarios.filter((usuario) => usuario.preferences?.notifications !== false);
      const clerkIds = clerkIdsUnicos(usuariosAtivos.map((usuario) => usuario.clerkId));

      const tokensDocs = clerkIds.length
        ? ((await PushTokenModel.find({ clerkId: { $in: clerkIds } })
            .select({ token: 1, clerkId: 1 })
            .lean()
            .exec()) as TokenComDono[])
        : [];

      const tokens = tokensDocs.map((documento) => documento.token);
      return { tokens: [...new Set(tokens)], targeted: tokens.length };
    }

    default:
      return { tokens: [], targeted: 0 };
  }
}

export async function reivindicarEnvio(id: string): Promise<boolean> {
  const resultado = await PushCampaignModel.findOneAndUpdate(
    { _id: id, status: { $in: ['draft', 'scheduled'] } },
    { $set: { status: 'sending', sendingStartedAt: new Date() } },
  );
  return resultado !== null && resultado !== undefined;
}

export async function enviarCampanha(id: string): Promise<void> {
  const reivindicou = await reivindicarEnvio(id);
  if (!reivindicou) return;

  try {
    const campanha = await PushCampaignModel.findById(id);
    if (!campanha) throw new Error('Campanha não encontrada');

    const { tokens, targeted } = await resolverSegmento(
      campanha.segment as PushCampaignSegment,
    );

    const stats = {
      targeted,
      sent: 0,
      failed: 0,
      deadTokens: 0,
    };

    if (tokens.length === 0) {
      await PushCampaignModel.findOneAndUpdate(
        { _id: id },
        { $set: { status: 'sent', sentAt: new Date(), receipts: [], stats, error: undefined } },
      );
      return;
    }

    const opcoes: { data?: Record<string, string>; image?: string } = {};
    if (campanha.imageUrl) opcoes.image = String(campanha.imageUrl);
    if (campanha.deepLink) opcoes.data = { url: String(campanha.deepLink) };

    const resultado =
      Object.keys(opcoes).length > 0
        ? await sendPushToTokens(tokens, String(campanha.title), String(campanha.body), opcoes)
        : await sendPushToTokens(tokens, String(campanha.title), String(campanha.body));

    const receipts: Array<{ id: string; token: string }> = [];
    for (let i = 0; i < resultado.tickets.length; i++) {
      const ticket = resultado.tickets[i];
      if (ticket.status === 'ok') {
        stats.sent += 1;
        receipts.push({ id: ticket.id, token: tokens[i] });
      } else if (ticket.details?.error !== 'DeviceNotRegistered') {
        stats.failed += 1;
      }
    }

    if (resultado.tickets.length < tokens.length) {
      stats.failed += tokens.length - resultado.tickets.length;
    }

    stats.deadTokens = resultado.mortos.length;

    await PushCampaignModel.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'sent', sentAt: new Date(), receipts, stats, error: undefined } },
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await PushCampaignModel.findOneAndUpdate(
      { _id: id },
      { $set: { status: 'failed', error: mensagem } },
    );
    throw erro;
  }
}

export async function agendarCampanhasPendentes(agora: Date): Promise<void> {
  const campanhas = await PushCampaignModel.find({
    status: 'scheduled',
    scheduledFor: { $lte: agora },
  } as Record<string, unknown>);
  for (const campanha of campanhas as Array<{ _id: unknown }>) {
    try {
      await enviarCampanha(String(campanha._id));
    } catch {
      // falha de uma campanha não interrompe as demais
    }
  }
}

export async function recuperarCampanhasTravadas(agora: Date): Promise<void> {
  const limite = new Date(agora.getTime() - 30 * 60 * 1000);
  await PushCampaignModel.updateMany(
    { status: 'sending', sendingStartedAt: { $lte: limite }, sentAt: { $exists: false } } as Record<string, unknown>,
    { $set: { status: 'failed', error: 'envio interrompido' } },
  );
}
