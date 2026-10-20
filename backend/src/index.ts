import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`API do guia comercial rodando em http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
