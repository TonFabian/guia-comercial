import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { validateProductionConfig } from './config.js';
import { agendarCicloDePlanos } from './services/plan-lifecycle.service.js';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  validateProductionConfig();
  await connectDatabase();
  if (process.env.PLAN_LIFECYCLE_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
    agendarCicloDePlanos();
  }
  app.listen(PORT, () => {
    console.log(`API do guia comercial rodando em http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
