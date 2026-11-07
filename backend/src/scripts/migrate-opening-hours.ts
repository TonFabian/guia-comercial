/**
 * Migração de Company: converte `openingHours` (texto livre) em `schedule`
 * estruturado ({ day, opens, closes } em minutos).
 *
 * Uso: npx tsx src/scripts/migrate-opening-hours.ts
 *
 * Processa apenas empresas com `openingHours` preenchido e `schedule` vazio —
 * logo, rodar mais de uma vez não refaz trabalho (idempotência). Linhas não
 * parseáveis NUNCA são descartadas: a empresa mantém `openingHours` e o
 * log registra cada linha para correção manual.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { CompanyModel } from '../models/company.model.js';
import { parseOpeningHoursString } from '../utils/opening-hours.js';
import type { ScheduleItem } from '../utils/opening-hours.js';

/** Resultado do planejamento de uma empresa: null = não precisa migrar. */
export interface PlanoMigracao {
  schedule: ScheduleItem[];
  /** Linhas de openingHours que não parsearam (empresa as mantém). */
  naoParseaveis: string[];
}

/**
 * Parte pura da migração (testável sem banco): dado o estado da empresa,
 * decide se migra e produz o schedule + as linhas que precisam de revisão.
 */
export function planejarMigracao(
  openingHours: string[] | undefined,
  schedule: ScheduleItem[] | undefined,
): PlanoMigracao | null {
  if (!openingHours || openingHours.length === 0) return null;
  if (schedule && schedule.length > 0) return null;

  const scheduleNovo: ScheduleItem[] = [];
  const naoParseaveis: string[] = [];
  for (const linha of openingHours) {
    const itens = parseOpeningHoursString(linha);
    if (itens) {
      scheduleNovo.push(...itens);
    } else {
      naoParseaveis.push(linha);
    }
  }
  return { schedule: scheduleNovo, naoParseaveis };
}

/**
 * Monta o update do MongoDB a partir do plano. As duas operações entram no
 * MESMO $set quando há não parseáveis — spread de uma segunda chave `$set`
 * descartaria o schedule silenciosamente (última chave vence no objeto JS).
 */
export function montarUpdate(
  plano: PlanoMigracao,
): Record<string, unknown> {
  if (plano.naoParseaveis.length > 0) {
    return {
      $set: { schedule: plano.schedule, openingHours: plano.naoParseaveis },
    };
  }
  return { $set: { schedule: plano.schedule }, $unset: { openingHours: '' } };
}

/** Migra todas as empresas elegíveis; retorna quantas foram alteradas. */
export async function migrarCompanies(): Promise<number> {
  const empresas = await CompanyModel.find({
    openingHours: { $exists: true, $ne: [] },
    $or: [{ schedule: { $exists: false } }, { schedule: { $size: 0 } }],
  });

  let migradas = 0;
  let comNaoParseaveis = 0;
  for (const empresa of empresas) {
    const plano = planejarMigracao(empresa.openingHours, empresa.schedule);
    if (!plano) continue;

    // Não parseáveis permanecem: a fonte de verdade só substitui o que o
    // parser traduziu com confiança.
    const atualizada = await CompanyModel.findByIdAndUpdate(
      empresa._id,
      montarUpdate(plano),
    );
    if (!atualizada) continue;
    migradas += 1;

    if (plano.naoParseaveis.length > 0) {
      comNaoParseaveis += 1;
      console.warn(
        `Empresa "${empresa.name}" (id ${String(empresa._id)}) mantém openingHours: ${plano.naoParseaveis.length} linha(s) não parseável(is)`,
      );
      for (const linha of plano.naoParseaveis) {
        console.warn(`  Não parseável: "${linha}"`);
      }
    }
  }

  console.log(`Empresas migradas: ${migradas} de ${empresas.length} elegíveis`);
  console.log(
    `Empresas com linhas não parseáveis (mantêm openingHours para correção manual): ${comNaoParseaveis}`,
  );
  return migradas;
}

async function main(): Promise<void> {
  await connectDatabase();
  await migrarCompanies();
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Falha na migração:', error);
  process.exit(1);
});
