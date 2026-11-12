import cron from 'node-cron';

import { CompanyModel } from '../models/company.model.js';
import { PlanNotificationModel } from '../models/plan-notification.model.js';
import { UserModel } from '../models/user.model.js';

import { sendEmail } from './email.service.js';
import { buildPlanEmail } from './email-templates.js';
import { planLabel } from './plan-label.js';
import { sendPushToUser } from './push.service.js';
import { todayInBrasilia } from '../utils/event-date.js';

export type PlanAction = 'expiring-7d' | 'expiring-1d' | 'expired' | null;

/** Diferença em dias entre duas datas YYYY-MM-DD (a - b). */
export function diasDeDiferenca(a: string, b: string): number {
  const [anoA, mesA, diaA] = a.split('-').map(Number) as [number, number, number];
  const [anoB, mesB, diaB] = b.split('-').map(Number) as [number, number, number];
  const msA = Date.UTC(anoA, mesA - 1, diaA);
  const msB = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((msA - msB) / 86400000);
}

/** Ação do ciclo para uma empresa no dia de hoje (spec §5.1).
 * D-0 é o dia do rebaixamento: o plano vale ATÉ a véspera. */
export function computeAction(
  plan: 'free' | 'basic' | 'premium',
  planExpiresAt: string | undefined,
  hoje: string,
): PlanAction {
  if (plan === 'free' || !planExpiresAt) return null;
  const dias = diasDeDiferenca(planExpiresAt, hoje);
  if (dias <= 0) return 'expired';
  if (dias === 7) return 'expiring-7d';
  if (dias === 1) return 'expiring-1d';
  return null;
}

const CONTEUDO: Record<
  Exclude<PlanAction, null>,
  {
    subject: (empresa: string, plano: string, vence: string) => string;
    push: (empresa: string, plano: string, vence: string) => string;
  }
> = {
  'expiring-7d': {
    subject: (empresa, plano) => `Seu plano ${plano} vence em 7 dias — empresa ${empresa}`,
    push: (empresa, plano) => `${empresa}: seu plano ${plano} vence em 7 dias — renove com a equipe do guia`,
  },
  'expiring-1d': {
    subject: (empresa, plano) => `Seu plano ${plano} vence amanhã — empresa ${empresa}`,
    push: (empresa, plano) => `${empresa}: seu plano ${plano} vence amanhã`,
  },
  expired: {
    subject: (empresa) => `Seu plano expirou — empresa ${empresa}`,
    push: (empresa) => `${empresa}: seu plano expirou — renove com a equipe do guia`,
  },
};

export interface ResultadoCiclo {
  notificadas: number;
  rebaixadas: number;
}

async function reivindicar(companyId: string, kind: Exclude<PlanAction, null>, planExpiresAt: string): Promise<boolean> {
  try {
    await PlanNotificationModel.create({ companyId, kind, planExpiresAt });
    return true;
  } catch (erro) {
    if ((erro as { code?: number }).code === 11000) return false;
    throw erro;
  }
}

export async function runPlanLifecycle(hoje: string): Promise<ResultadoCiclo> {
  const empresas = await CompanyModel.find({
    plan: { $in: ['basic', 'premium'] },
    planExpiresAt: { $exists: true, $ne: null },
  })
    .lean<{ _id: unknown; name?: string; plan: 'basic' | 'premium'; planExpiresAt: string; ownerClerkId?: string }[]>()
    .exec();

  let notificadas = 0;
  let rebaixadas = 0;

  for (const empresa of empresas) {
    if (typeof empresa.planExpiresAt !== 'string') continue;
    const acao = computeAction(empresa.plan, empresa.planExpiresAt, hoje);
    if (!acao) continue;

    const ganhouClaim = await reivindicar(String(empresa._id), acao, empresa.planExpiresAt);
    if (!ganhouClaim) continue;
    notificadas += 1;

    const dono = empresa.ownerClerkId
      ? await UserModel.findOne({ clerkId: empresa.ownerClerkId }).lean<{ name?: string; email?: string } | null>().exec()
      : null;
    if (dono?.email) {
      const rotulo = planLabel(empresa.plan);
      const vence = empresa.planExpiresAt.split('-').reverse().join('/');
      const nome = empresa.name ?? 'Sua empresa';
      const conteudo = CONTEUDO[acao];
      await sendEmail({
        to: dono.email,
        subject: conteudo.subject(nome, rotulo, vence),
        html: buildPlanEmail(acao, {
          ownerName: dono.name ?? '',
          companyName: nome,
          planLabel: rotulo,
          expiresAt: vence,
          ctaHref: process.env.APP_PUBLIC_URL ?? '#',
        }),
      }).catch(() => undefined);
      if (empresa.ownerClerkId) {
        await sendPushToUser(empresa.ownerClerkId, conteudo.push(nome, rotulo, vence), 'Guia Comercial').catch(() => undefined);
      }
    }

    if (acao === 'expired') {
      await CompanyModel.updateOne(
        { _id: empresa._id as never, plan: { $in: ['basic', 'premium'] } },
        { $set: { plan: 'free' } },
      ).exec();
      rebaixadas += 1;
    }
  }

  return { notificadas, rebaixadas };
}

export function agendarCicloDePlanos(): void {
  cron.schedule('0 7 * * *', () => {
    void runPlanLifecycle(todayInBrasilia()).catch((erro) => {
      console.error('[planos] ciclo diário falhou:', erro);
    });
  }, { timezone: 'America/Sao_Paulo', name: 'ciclo-planos' });
}
