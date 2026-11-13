import { PushCampaignModel } from '../models/push-campaign.model.js';
import { PushTokenModel } from '../models/push-token.model.js';

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const TAMANHO_LOTE = 100;
const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

interface ParReceipt {
  id: string;
  token: string;
}

interface StatsCampanha {
  targeted: number;
  sent: number;
  failed: number;
  deadTokens: number;
}

interface CampanhaComReceipts {
  _id: unknown;
  sentAt?: unknown;
  receipts?: unknown;
  stats?: unknown;
}

function comoStats(valor: unknown): StatsCampanha {
  const base = (valor && typeof valor === 'object' ? valor : {}) as Record<string, unknown>;
  return {
    targeted: typeof base.targeted === 'number' ? base.targeted : 0,
    sent: typeof base.sent === 'number' ? base.sent : 0,
    failed: typeof base.failed === 'number' ? base.failed : 0,
    deadTokens: typeof base.deadTokens === 'number' ? base.deadTokens : 0,
  };
}

function comoPares(valor: unknown): ParReceipt[] {
  if (!Array.isArray(valor)) return [];
  const pares: ParReceipt[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const registro = item as Record<string, unknown>;
    if (typeof registro.id !== 'string' || typeof registro.token !== 'string') continue;
    pares.push({ id: registro.id, token: registro.token });
  }
  return pares;
}

function statusHttp(resposta: unknown): number {
  if (resposta && typeof resposta === 'object' && 'status' in resposta) {
    const status = (resposta as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return 200;
}

function respostaOk(resposta: unknown, status: number): boolean {
  if (resposta && typeof resposta === 'object' && 'ok' in resposta) {
    const ok = (resposta as { ok?: unknown }).ok;
    if (typeof ok === 'boolean') return ok;
  }
  return status >= 200 && status < 300;
}

export async function processarReceiptsPendentes(agora: Date): Promise<void> {
  const campanhas = (await PushCampaignModel.find({
    receipts: { $exists: true, $ne: [] },
  } as Record<string, unknown>)) as CampanhaComReceipts[];

  for (const campanha of campanhas) {
    try {
      await processarCampanha(campanha, agora);
    } catch (erro) {
      console.warn(
        '[push-receipts] falha ao processar campanha:',
        erro instanceof Error ? erro.message : erro,
      );
    }
  }
}

async function processarCampanha(campanha: CampanhaComReceipts, agora: Date): Promise<void> {
  const id = String(campanha._id);
  const pares = comoPares(campanha.receipts);
  if (pares.length === 0) return;

  const stats = comoStats(campanha.stats);

  const sentAtRaw = campanha.sentAt;
  const sentAt = sentAtRaw ? new Date(sentAtRaw as string | number | Date) : null;
  const idadeMs = sentAt && !Number.isNaN(sentAt.getTime())
    ? agora.getTime() - sentAt.getTime()
    : 0;
  const velho = sentAt !== null && !Number.isNaN(sentAt.getTime()) && idadeMs > VINTE_QUATRO_HORAS_MS;

  if (velho) {
    console.warn(`[push-receipts] receipts descartados (>24h) da campanha ${id}: ${pares.length}`);
    await PushCampaignModel.findOneAndUpdate(
      { _id: id } as Record<string, unknown>,
      { $set: { receipts: [], stats } } as Record<string, unknown>,
    );
    return;
  }

  let fetchFalhou = false;

  for (let inicio = 0; inicio < pares.length; inicio += TAMANHO_LOTE) {
    const lote = pares.slice(inicio, inicio + TAMANHO_LOTE);
    const ids = lote.map((par) => par.id);

    let resposta: unknown;
    try {
      resposta = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch (erro) {
      console.warn('[push-receipts] falha de rede:', erro instanceof Error ? erro.message : erro);
      fetchFalhou = true;
      break;
    }

    const status = statusHttp(resposta);
    if (!respostaOk(resposta, status)) {
      console.warn(`[push-receipts] API do Expo respondeu ${status}`);
      fetchFalhou = true;
      break;
    }

    let json: unknown;
    try {
      json = typeof (resposta as { json?: unknown })?.json === 'function'
        ? await (resposta as { json: () => Promise<unknown> }).json()
        : resposta;
    } catch (erro) {
      console.warn('[push-receipts] resposta inválida:', erro instanceof Error ? erro.message : erro);
      fetchFalhou = true;
      break;
    }

    const dadosRaw = (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>))
      ? (json as { data?: unknown }).data
      : undefined;
    const dados = (dadosRaw && typeof dadosRaw === 'object' && !Array.isArray(dadosRaw))
      ? (dadosRaw as Record<string, unknown>)
      : {};

    for (const par of lote) {
      const receipt = dados[par.id];
      if (!receipt || typeof receipt !== 'object') {
        console.warn(`[push-receipts] receipt ausente, descartando: ${par.id}`);
        continue;
      }

      const registro = receipt as { status?: unknown; details?: { error?: unknown } };
      if (registro.status === 'ok') {
        continue;
      }

      const erroDetalhe = typeof registro.details?.error === 'string' ? registro.details.error : undefined;
      if (erroDetalhe === 'DeviceNotRegistered') {
        try {
          const resultado = await PushTokenModel.deleteOne({ token: par.token } as Record<string, unknown>);
          const removidos = (resultado as { deletedCount?: number })?.deletedCount ?? 0;
          if (removidos > 0) {
            stats.deadTokens += 1;
          }
        } catch (erro) {
          console.warn('[push-receipts] falha ao remover token morto:', erro instanceof Error ? erro.message : erro);
        }
      } else {
        console.warn(`[push-receipts] receipt com erro (${erroDetalhe ?? registro.status}), descartando: ${par.id}`);
      }
      // par sai da lista em qualquer caso
    }
  }

  if (fetchFalhou) return;

  await PushCampaignModel.findOneAndUpdate(
    { _id: id } as Record<string, unknown>,
    { $set: { receipts: [], stats } } as Record<string, unknown>,
  );
}
