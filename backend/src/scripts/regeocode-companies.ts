/**
 * Re-geocodifica endereços de Company com cidade + UF na query.
 * Uso: npx tsx src/scripts/regeocode-companies.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import { geocodeAddress } from '../utils/geocode.js';

async function main(): Promise<void> {
  await connectDatabase();
  const empresas = await CompanyModel.find({ address: { $exists: true, $ne: '' } });
  let corrigidas = 0;

  for (const empresa of empresas) {
    const cityDoc = empresa.city
      ? await CityModel.findById(empresa.city).lean()
      : null;
    if (!cityDoc) {
      console.warn(`[skip] ${empresa.slug}: sem cidade vinculada`);
      continue;
    }
    const coords = await geocodeAddress(
      empresa.address as string,
      cityDoc.name,
      cityDoc.state,
    );
    if (!coords) {
      console.warn(`[falha] ${empresa.slug}: geocoder não confirmou a cidade`);
      continue;
    }
    const antes = { latitude: empresa.latitude, longitude: empresa.longitude };
    empresa.latitude = coords.latitude;
    empresa.longitude = coords.longitude;
    await empresa.save();
    corrigidas += 1;
    console.log(`[ok] ${empresa.slug}: ${JSON.stringify(antes)} → ${coords.latitude}, ${coords.longitude}`);
    // Nominatim: 1 req/s.
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  console.log(`Concluído: ${corrigidas} empresa(s) re-geocodificada(s).`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Falha:', error);
  process.exit(1);
});
