import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';

const email = process.argv[2] ?? 'wrochasilva33@gmail.com';
const companySlug = process.argv[3] ?? 'construtora-alicerce';

async function main(): Promise<void> {
  await connectDatabase();
  const user = await UserModel.findOne({ email }).lean();
  if (!user?.clerkId) {
    console.error(`Usuário com email ${email} não encontrado ou sem clerkId.`);
    process.exit(1);
  }
  const company = await CompanyModel.findOne({ slug: companySlug });
  if (!company) {
    console.error(`Empresa com slug ${companySlug} não encontrada.`);
    process.exit(1);
  }
  company.ownerClerkId = user.clerkId;
  await company.save();
  console.log(`Empresa "${company.name}" associada ao usuário ${email} (clerkId ${user.clerkId}).`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Falha:', error);
  process.exit(1);
});
