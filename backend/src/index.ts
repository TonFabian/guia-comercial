import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { validateProductionConfig } from './config.js';
import { agendarCicloDePlanos } from './services/plan-lifecycle.service.js';
import cron from 'node-cron';
import {
  agendarCampanhasPendentes,
  recuperarCampanhasTravadas,
} from './services/push-campaign.service.js';
import { processarReceiptsPendentes } from './services/push-receipt.service.js';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  validateProductionConfig();
  await connectDatabase();
  if (process.env.PLAN_LIFECYCLE_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
    agendarCicloDePlanos();
  }
  if (process.env.PUSH_CENTER_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
    cron.schedule(
      '*/5 * * * *',
      () => {
        void agendarCampanhasPendentes(new Date()).catch((erro) => {
          console.error('[push-center] agendadas falhou:', erro);
        });
        void processarReceiptsPendentes(new Date()).catch((erro) => {
          console.error('[push-center] receipts falhou:', erro);
        });
        void recuperarCampanhasTravadas(new Date()).catch((erro) => {
          console.error('[push-center] recuperacao falhou:', erro);
        });
      },
      { timezone: 'America/Sao_Paulo', name: 'push-center' },
    );
  }
  app.listen(PORT, () => {
    console.log(`API do guia comercial rodando em http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
