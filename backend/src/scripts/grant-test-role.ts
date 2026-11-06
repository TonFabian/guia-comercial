/**
 * Concede papéis de teste a um usuário Clerk já existente (após primeiro login).
 *
 * Uso:
 *   CLERK_ID=user_xxx ROLE=admin EMAIL=foo@bar.com npx tsx src/scripts/grant-test-role.ts
 *   CLERK_ID=user_xxx ROLE=company EMAIL=foo@bar.com npx tsx src/scripts/grant-test-role.ts
 *   CLERK_ID=user_xxx ROLE=autonomous EMAIL=foo@bar.com npx tsx src/scripts/grant-test-role.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { UserModel } from '../models/user.model.js';
import { CompanyModel } from '../models/company.model.js';
import { CityModel } from '../models/city.model.js';
import { AutonomousProfessionalModel } from '../models/autonomous-professional.model.js';
import { CategoryModel } from '../models/category.model.js';

const clerkId = process.env.CLERK_ID;
const role = process.env.ROLE as 'admin' | 'company' | 'autonomous' | 'common' | undefined;
const email = process.env.EMAIL ?? 'test@example.com';

if (!clerkId || !role) {
  console.error('Defina CLERK_ID e ROLE (admin|company|autonomous|common).');
  process.exit(1);
}

async function main(): Promise<void> {
  await connectDatabase();
  const user = await UserModel.findOneAndUpdate(
    { clerkId },
    { $set: { clerkId, email, role: role === 'admin' ? 'admin' : 'user' } },
    { upsert: true, new: true },
  );

  if (role === 'company') {
    const city = await CityModel.findOne().lean();
    const category = await CategoryModel.findOne().lean();
    await CompanyModel.findOneAndUpdate(
      { ownerClerkId: clerkId },
      {
        $setOnInsert: {
          name: 'Empresa de Teste',
          slug: `empresa-teste-${Date.now()}`,
          description: 'Empresa criada para testes E2E.',
          category: category?._id,
          city: city?._id,
          ownerClerkId: clerkId,
          phone: '86999999999',
          whatsapp: '86999999999',
          address: 'Rua Teste, 1',
        },
      },
      { upsert: true, new: true },
    );
    await UserModel.updateOne({ clerkId }, { $addToSet: { ownedCompanyIds: 'empresa-teste' } });
  }

  if (role === 'autonomous') {
    const city = await CityModel.findOne().lean();
    const category = await CategoryModel.findOne().lean();
    await AutonomousProfessionalModel.findOneAndUpdate(
      { ownerClerkId: clerkId },
      {
        $setOnInsert: {
          name: 'Profissional de Teste',
          slug: `prof-teste-${Date.now()}`,
          category: category?._id,
          city: city?._id,
          ownerClerkId: clerkId,
          phone: '86999999999',
          whatsapp: '86999999999',
          bio: 'Profissional de teste.',
        },
      },
      { upsert: true, new: true },
    );
  }

  console.log('OK:', user?.clerkId, role);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});