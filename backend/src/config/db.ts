import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI não definida. Copie .env.example para .env e configure-a.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB conectado');
}
