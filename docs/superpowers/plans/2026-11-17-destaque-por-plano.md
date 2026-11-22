# Destaque por plano (Premium) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `plan === 'premium'` ser a única regra de destaque na home, remover `isFeatured` e liberar a tela completa para básico e premium.

**Architecture:** O backend ganha o filtro `plan` em `GET /companies` e deixa de ler `featured`. A home faz duas consultas (premium para o carrossel, básico+free para a lista). O detalhe usa `companyPlan` para escolher a tela completa ou enxuta.

**Tech Stack:** Express 5 + Mongoose 9 + zod + Vitest/supertest; Expo SDK 58 + React Native 0.88 + Vitest; Vite + React + TypeScript.

---

## Mapa de arquivos

**Backend**
- Modificar: `backend/src/services/company.service.ts`
- Modificar: `backend/src/controllers/company.controller.ts`
- Modificar: `backend/src/models/company.model.ts`
- Modificar: `backend/src/types/dto.ts`
- Modificar: `backend/src/scripts/seed.ts`
- Modificar: `backend/src/utils/guest.ts`
- Modificar: `backend/src/utils/guest.test.ts`
- Modificar: `backend/src/routes/companies.category.test.ts`
- Modificar: `backend/src/routes/security.test.ts`
- Criar: `backend/src/routes/companies.plan-filter.test.ts`

**Mobile**
- Modificar: `mobile/src/features/company/company-plan.ts`
- Modificar: `mobile/src/features/company/company-plan.test.ts`
- Modificar: `mobile/src/features/company/company-free-view.ts`
- Modificar: `mobile/src/features/company/company-free-view.test.ts`
- Modificar: `mobile/src/features/company/company-details.ts`
- Modificar: `mobile/src/features/company/company-details.test.ts`
- Modificar: `mobile/src/features/company/company-detail-screen.tsx`
- Modificar: `mobile/src/services/api.ts`
- Modificar: `mobile/src/data/mock.ts`
- Modificar: `mobile/src/features/home/use-home-data.ts`
- Modificar: `mobile/src/app/(tabs)/index.tsx`
- Criar: `mobile/src/features/home/featured-companies.tsx`
- Remover: `mobile/src/features/home/featured-company.tsx`
- Remover: `mobile/src/features/home/home-companies.ts`
- Remover: `mobile/src/features/home/home-companies.test.ts`

**Domínio compartilhado**
- Modificar: `shared/domain.ts`
- Modificar: `mobile/src/types/domain.ts`
- Modificar: `admin/src/types/domain.ts`

---

## Task 1: Backend — filtro `plan` na listagem (TDD)

**Files:**
- Create: `backend/src/routes/companies.plan-filter.test.ts`
- Modify: `backend/src/services/company.service.ts`
- Modify: `backend/src/controllers/company.controller.ts`

- [ ] **Step 1: Criar o teste de integração que falha**

Crie `backend/src/routes/companies.plan-filter.test.ts` com o conteúdo completo:

```ts
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryModel } from '../models/category.model.js';
import { CityModel } from '../models/city.model.js';
import { CompanyModel } from '../models/company.model.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_placeholder');
vi.stubEnv('CLERK_PUBLISHABLE_KEY', 'pk_test_placeholder');

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    authenticateRequest: async () => ({ isAuthenticated: false, toAuth: () => ({ userId: null }) }),
    users: {
      getUser: async (id: string) => ({
        id,
        firstName: 'Perfil',
        lastName: 'Clerk',
        emailAddresses: [{ id: 'em_1', emailAddress: `${id}@example.com` }],
        primaryEmailAddressId: 'em_1',
        phoneNumbers: [],
        primaryPhoneNumberId: null,
        imageUrl: 'https://img.clerk.com/perfil.png',
      }),
    },
  }),
}));

vi.mock('../models/category.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CategoryModel: criarModeloEmMemoria() };
});

vi.mock('../models/city.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CityModel: criarModeloEmMemoria() };
});

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});

let app: Express;

const modeloCategorias = CategoryModel as unknown as MemoryModel;
const modeloCidades = CityModel as unknown as MemoryModel;
const modeloEmpresas = CompanyModel as unknown as MemoryModel;

const ID_CATEGORIA = '000000000000000000000140';
const ID_CIDADE = '000000000000000000000340';

const categoriasFake: MemoryDocument[] = [
  { _id: ID_CATEGORIA, slug: 'restaurante', name: 'Restaurantes' },
];

const cidadesFake: MemoryDocument[] = [
  { _id: ID_CIDADE, name: 'Castelo do Piauí', slug: 'castelo-do-piaui', state: 'PI' },
];

// C sem plan: ausente → tratada como free no filtro.
const empresasFake: MemoryDocument[] = [
  {
    _id: '000000000000000000000241',
    slug: 'a-free',
    name: 'A Free',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'free',
  },
  {
    _id: '000000000000000000000242',
    slug: 'b-premium',
    name: 'B Premium',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'premium',
  },
  {
    _id: '000000000000000000000243',
    slug: 'c-sem-plan',
    name: 'C Sem Plan',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
  },
  {
    _id: '000000000000000000000244',
    slug: 'd-basic',
    name: 'D Basic',
    description: 'd',
    category: ID_CATEGORIA,
    city: ID_CIDADE,
    plan: 'basic',
  },
];

beforeAll(async () => {
  app = (await import('../app.js')).default as unknown as Express;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  modeloCategorias.documents.length = 0;
  modeloCategorias.documents.push(...categoriasFake.map((doc) => ({ ...doc })));

  modeloCidades.documents.length = 0;
  modeloCidades.documents.push(...cidadesFake.map((doc) => ({ ...doc })));

  modeloEmpresas.documents.length = 0;
  modeloEmpresas.documents.push(...empresasFake.map((doc) => ({ ...doc })));
});

describe('GET /api/companies?plan', () => {
  it('devolve somente empresas premium', async () => {
    const response = await request(app).get('/api/companies?plan=premium');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'B Premium',
    ]);
  });

  it('devolve básico e free, incluindo empresa sem plan', async () => {
    const response = await request(app).get('/api/companies?plan=basic,free');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'A Free',
      'C Sem Plan',
      'D Basic',
    ]);
  });

  it('inclui empresa sem plan no filtro free', async () => {
    const response = await request(app).get('/api/companies?plan=free');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((empresa: { name: string }) => empresa.name)).toEqual([
      'A Free',
      'C Sem Plan',
    ]);
  });

  it('deduplica planos repetidos na lista', async () => {
    const response = await request(app).get('/api/companies?plan=premium,premium');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
  });

  it('plan inválido → 400', async () => {
    const response = await request(app).get('/api/companies?plan=gold');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'plan'");
  });

  it('plan vazio → sem filtro', async () => {
    const response = await request(app).get('/api/companies?plan=');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(4);
  });

  it('plan repetido como parâmetro → 400', async () => {
    const response = await request(app).get('/api/companies?plan=free&plan=premium');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'plan'");
  });

  it('combina busca textual com filtro de plano', async () => {
    const premium = await request(app).get('/api/companies?q=Premium&plan=premium');
    expect(premium.status).toBe(200);
    expect(premium.body.total).toBe(1);

    const free = await request(app).get('/api/companies?q=Premium&plan=free');
    expect(free.status).toBe(200);
    expect(free.body.total).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run:

```bash
cd backend
npx vitest run src/routes/companies.plan-filter.test.ts
```

Expected: FAIL. `plan=premium` devolve 4 empresas (o filtro ainda é ignorado) e `plan=gold` devolve 200 em vez de 400.

- [ ] **Step 3: Implementar o filtro no service**

Em `backend/src/services/company.service.ts`:

1. Troque o import de `query.js` (mantenha `lerBooleano` até a Task 2):

```ts
import { lerBooleano, lerListaDeSlugs, lerTexto, parametroInvalido } from '../utils/query.js';
```

2. Substitua o tipo `CompanyQuery` por (mantenha `isFeatured` até a Task 2):

```ts
type CompanyQuery = {
  category?: string | { $in: string[] };
  $and?: Array<Record<string, unknown>>;
  $or?: Array<Record<string, unknown>>;
  isFeatured?: boolean;
  ownerClerkId?: string;
  city?: string | RegExp;
};
```

3. Em `CompanyListFilters`, mantenha `featured?: unknown;` e adicione:

```ts
  /** 'free,basic,premium' (lista separada por vírgula) */
  plan?: unknown;
```

4. Adicione a constante perto do topo do módulo, depois dos imports:

```ts
const PLANOS_VALIDOS = new Set(['free', 'basic', 'premium']);
```

5. Depois do bloco de `destaque` existente, adicione:

```ts
  const planos = lerListaDeSlugs(filters.plan, { nome: 'plan' });
  if (planos !== undefined) {
    const invalido = planos.find((plano) => !PLANOS_VALIDOS.has(plano));
    if (invalido !== undefined) {
      throw parametroInvalido('plan', "valores aceitos: 'free', 'basic' e 'premium'");
    }
    // `free` inclui documentos antigos sem o campo `plan`.
    const condicaoPlano: Record<string, unknown> = planos.includes('free')
      ? { $or: [{ plan: { $in: planos } }, { plan: { $exists: false } }] }
      : { plan: { $in: planos } };
    query.$and = [...(query.$and ?? []), condicaoPlano];
  }
```

6. **Não remova `featured` nem a ordenação `{ isFeatured: -1, name: 1 }` nesta task.** Isso quebraria os testes existentes; a remoção acontece na Task 2, junto com a atualização de `companies.category.test.ts` e `security.test.ts`.

- [ ] **Step 4: Repassar `plan` no controller**

Em `backend/src/controllers/company.controller.ts`, troque o objeto do `listCompanies` por:

```ts
    {
      category: req.query.category,
      q: req.query.q,
      plan: req.query.plan,
      owner: req.query.owner,
      city: req.query.city,
      prioritize: req.query.prioritize,
    },
```

- [ ] **Step 5: Rodar o teste novo e ver passar**

Run:

```bash
cd backend
npx vitest run src/routes/companies.plan-filter.test.ts
```

Expected: PASS (8 testes).

- [ ] **Step 6: Rodar o gate do backend**

Run:

```bash
cd backend
npm run lint
npm run typecheck
npm test
```

Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/companies.plan-filter.test.ts backend/src/services/company.service.ts backend/src/controllers/company.controller.ts
git commit -m "feat(backend): adiciona filtro por plano em /companies" -m "Generated-by: opencode (deepseek-v4.1-flash-free)"
```

---

## Task 2: Backend — remover `isFeatured` do modelo, seed e testes

**Files:**
- Modify: `backend/src/models/company.model.ts`
- Modify: `backend/src/types/dto.ts`
- Modify: `backend/src/scripts/seed.ts`
- Modify: `backend/src/services/company.service.ts`
- Modify: `backend/src/controllers/company.controller.ts`
- Modify: `backend/src/utils/guest.ts`
- Modify: `backend/src/utils/guest.test.ts`
- Modify: `backend/src/routes/companies.category.test.ts`
- Modify: `backend/src/routes/security.test.ts`

- [ ] **Step 1: Remover o campo do modelo, do DTO e do service**

Em `backend/src/models/company.model.ts`, remova a linha:

```ts
    isFeatured: { type: Boolean, default: false },
```

Em `backend/src/types/dto.ts`, remova a linha de `createCompanySchema`:

```ts
  isFeatured: z.boolean().optional(),
```

Em `backend/src/services/company.service.ts`:

1. Remova `isFeatured?: boolean;` do tipo `CompanyQuery`.
2. Remova `featured?: unknown;` de `CompanyListFilters`.
3. Remova `lerBooleano` do import de `../utils/query.js`.
4. Remova o bloco:

```ts
  const destaque = lerBooleano(filters.featured, 'featured');
  if (destaque !== undefined) {
    query.isFeatured = destaque;
  }
```

5. Troque as duas ordenações `.sort({ isFeatured: -1, name: 1 })` por:

```ts
      .sort({ name: 1 })
```

São duas ocorrências: no ramo `priorizarPorPlano` e no ramo paginado.

Em `backend/src/controllers/company.controller.ts`, remova `featured: req.query.featured,` do objeto passado a `listCompanies`.

- [ ] **Step 2: Atualizar o seed**

Em `backend/src/scripts/seed.ts`:

1. Na Construtora Alicerce, remova `isFeatured: true,` e mantenha `plan: 'premium',`.
2. No Restaurante Sabor & Arte, troque `isFeatured: true,` por `plan: 'basic',`.

O bloco do Restaurante deve ficar assim:

```ts
      address: 'Rua das Flores, 300 — Centro',
      city: casteloId,
      plan: 'basic',
      rating: 4.5,
```

- [ ] **Step 3: Atualizar o teste de categorias**

Em `backend/src/routes/companies.category.test.ts`:

1. Remova as quatro linhas `isFeatured: false,` das fixtures `empresasFake`.
2. Substitua o teste:

```ts
  it('featured repetido → 400', async () => {
    const response = await request(app).get('/api/companies?featured=true&featured=false');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'featured'");
  });
```

por:

```ts
  it('plan repetido → 400', async () => {
    const response = await request(app).get('/api/companies?plan=free&plan=premium');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'plan'");
  });
```

- [ ] **Step 4: Atualizar o teste de segurança**

Em `backend/src/routes/security.test.ts`:

1. Nas fixtures `empresasFake`, troque `isFeatured: true,` por `plan: 'premium',` e `isFeatured: false,` por `plan: 'free',`.
2. No comentário de `CASOS_VARREDURA`, troque `category, q, featured, owner, city` por `category, q, plan, owner, city`.
3. Remova:

```ts
  caso('/api/companies?featured=1', 400),
```

e adicione:

```ts
  caso('/api/companies?plan=gold', 400),
  caso('/api/companies?plan=free&plan=premium', 400),
```

4. Na lista de `expectativas`, substitua:

```ts
    { rota: '/api/companies?featured=false', total: 1, campoTitulo: 'name', primeiroTitulo: 'Oficina Rocha' },
```

por:

```ts
    { rota: '/api/companies?plan=premium', total: 1, campoTitulo: 'name', primeiroTitulo: 'Pizzaria Lumière' },
    { rota: '/api/companies?plan=free', total: 1, campoTitulo: 'name', primeiroTitulo: 'Oficina Rocha' },
```

- [ ] **Step 5: Atualizar guest**

Em `backend/src/utils/guest.test.ts`, remova a linha:

```ts
  isFeatured: true,
```

Em `backend/src/utils/guest.ts`, troque o comentário:

```ts
 * O `active` separa da Company (que tem `isFeatured`); o `slug` separa da
```

por:

```ts
 * O `active` separa da Company (que não tem `active`); o `slug` separa da
```

- [ ] **Step 6: Confirmar que o backend não usa mais o campo**

Run:

```bash
cd backend
grep -rn "isFeatured" src || true
```

Expected: nenhuma saída.

- [ ] **Step 7: Rodar o gate do backend**

Run:

```bash
cd backend
npm run lint
npm run typecheck
npm test
```

Expected: tudo verde.

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/company.model.ts backend/src/types/dto.ts backend/src/scripts/seed.ts backend/src/services/company.service.ts backend/src/controllers/company.controller.ts backend/src/utils/guest.ts backend/src/utils/guest.test.ts backend/src/routes/companies.category.test.ts backend/src/routes/security.test.ts
git commit -m "refactor(backend): remove isFeatured de empresas" -m "Generated-by: opencode (deepseek-v4.1-flash-free)"
```

---

## Task 3: Mobile — detalhe por plano (TDD)

**Files:**
- Modify: `mobile/src/features/company/company-free-view.test.ts`
- Modify: `mobile/src/features/company/company-free-view.ts`
- Modify: `mobile/src/features/company/company-details.test.ts`
- Modify: `mobile/src/features/company/company-details.ts`
- Modify: `mobile/src/features/company/company-detail-screen.tsx`

- [ ] **Step 1: Escrever os testes de variante que falham**

Em `mobile/src/features/company/company-free-view.test.ts`, substitua o bloco `describe('companyDetailVariant', ...)` por:

```ts
describe('companyDetailVariant', () => {
  it('usa a tela completa para premium', () => {
    expect(companyDetailVariant(empresa({ _id: '1', plan: 'premium' }))).toBe('full');
  });

  it('usa a tela completa para básico', () => {
    expect(companyDetailVariant(empresa({ _id: '1', plan: 'basic' }))).toBe('full');
  });

  it('usa a tela enxuta para free', () => {
    expect(companyDetailVariant(empresa({ _id: '1', plan: 'free' }))).toBe('free');
  });

  it('usa a tela enxuta quando o plano não está definido', () => {
    expect(companyDetailVariant(empresa({ _id: '1' }))).toBe('free');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run:

```bash
cd mobile
npx vitest run src/features/company/company-free-view.test.ts
```

Expected: FAIL no caso do plano `basic` (hoje ele cai na tela enxuta).

- [ ] **Step 3: Implementar a variante por plano**

Em `mobile/src/features/company/company-free-view.ts`, adicione o import:

```ts
import { companyPlan } from './company-plan';
```

e substitua a função:

```ts
export function companyDetailVariant(company: Company): CompanyDetailVariant {
  return company.isFeatured === true ? 'full' : 'free';
}
```

por:

```ts
export function companyDetailVariant(company: Company): CompanyDetailVariant {
  return companyPlan(company) === 'free' ? 'free' : 'full';
}
```

- [ ] **Step 4: Escrever o teste de `isPremium` que falha**

Em `mobile/src/features/company/company-details.test.ts`, adicione ao final do arquivo:

```ts
describe('buildCompanyDetails — isPremium', () => {
  it('marca premium', () => {
    expect(buildCompanyDetails(empresa({ _id: '1', plan: 'premium' })).isPremium).toBe(true);
  });

  it('não marca básico nem free', () => {
    expect(buildCompanyDetails(empresa({ _id: '1', plan: 'basic' })).isPremium).toBe(false);
    expect(buildCompanyDetails(empresa({ _id: '1' })).isPremium).toBe(false);
  });
});
```

- [ ] **Step 5: Rodar e confirmar que falha**

Run:

```bash
cd mobile
npx vitest run src/features/company/company-details.test.ts
```

Expected: FAIL — `isPremium` ainda não existe.

- [ ] **Step 6: Implementar `isPremium` e atualizar a tela**

Em `mobile/src/features/company/company-details.ts`:

1. Adicione o import:

```ts
import { companyPlan } from './company-plan';
```

2. No tipo `CompanyDetails`, troque:

```ts
  isFeatured: boolean;
```

por:

```ts
  isPremium: boolean;
```

3. Em `buildCompanyDetails`, troque:

```ts
    isFeatured: company.isFeatured === true,
```

por:

```ts
    isPremium: companyPlan(company) === 'premium',
```

Em `mobile/src/features/company/company-detail-screen.tsx`, troque:

```tsx
            {details.isFeatured ? (
```

por:

```tsx
            {details.isPremium ? (
```

- [ ] **Step 7: Rodar os testes e o typecheck**

Run:

```bash
cd mobile
npx vitest run src/features/company/company-free-view.test.ts src/features/company/company-details.test.ts
npm run typecheck
```

Expected: testes PASS; typecheck OK.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/features/company/company-free-view.ts mobile/src/features/company/company-free-view.test.ts mobile/src/features/company/company-details.ts mobile/src/features/company/company-details.test.ts mobile/src/features/company/company-detail-screen.tsx
git commit -m "refactor(mobile): usa plano na tela de detalhe da empresa" -m "Generated-by: opencode (deepseek-v4.1-flash-free)"
```

---

## Task 4: Mobile — dados, home e carrossel de premium

**Files:**
- Modify: `mobile/src/features/company/company-plan.ts`
- Modify: `mobile/src/features/company/company-plan.test.ts`
- Modify: `mobile/src/services/api.ts`
- Modify: `mobile/src/data/mock.ts`
- Modify: `mobile/src/features/home/use-home-data.ts`
- Modify: `mobile/src/app/(tabs)/index.tsx`
- Create: `mobile/src/features/home/featured-companies.tsx`
- Delete: `mobile/src/features/home/featured-company.tsx`
- Delete: `mobile/src/features/home/home-companies.ts`
- Delete: `mobile/src/features/home/home-companies.test.ts`

- [ ] **Step 1: Escrever o teste do helper de filtro que falha**

Em `mobile/src/features/company/company-plan.test.ts`, troque o import:

```ts
import { companyPlan, hasFeature, planLabel, sortCompaniesByPlan } from './company-plan';
```

por:

```ts
import {
  companyPlan,
  filterCompaniesByPlan,
  hasFeature,
  planLabel,
  sortCompaniesByPlan,
} from './company-plan';
```

e adicione este bloco antes do `describe('planLabel', ...)`:

```ts
  describe('filterCompaniesByPlan', () => {
    it('mantém só os planos pedidos e trata ausente como free', () => {
      const livre: Company = { ...base, _id: '2', name: 'B Free', slug: 'b' };
      const premium: Company = { ...base, _id: '3', name: 'A Premium', slug: 'a', plan: 'premium' };
      const basico: Company = { ...base, _id: '4', name: 'C Basic', slug: 'c', plan: 'basic' };

      expect(
        filterCompaniesByPlan([livre, premium, basico], ['premium']).map((c) => c._id),
      ).toEqual(['3']);
      expect(
        filterCompaniesByPlan([livre, premium, basico], ['basic', 'free']).map((c) => c._id),
      ).toEqual(['2', '4']);
    });

    it('devolve todos quando a lista de planos está vazia', () => {
      const a: Company = { ...base, _id: '2', name: 'A', slug: 'a' };
      const b: Company = { ...base, _id: '3', name: 'B', slug: 'b', plan: 'premium' };

      expect(filterCompaniesByPlan([a, b], [])).toEqual([a, b]);
    });
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run:

```bash
cd mobile
npx vitest run src/features/company/company-plan.test.ts
```

Expected: FAIL — `filterCompaniesByPlan` não existe.

- [ ] **Step 3: Implementar o helper**

Em `mobile/src/features/company/company-plan.ts`, adicione depois de `sortCompaniesByPlan`:

```ts
/** Mantém apenas as empresas cujo plano está na lista; lista vazia = todos. */
export function filterCompaniesByPlan(companies: Company[], plans: Plan[]): Company[] {
  if (plans.length === 0) return companies;
  const permitidos = new Set<Plan>(plans);
  return companies.filter((company) => permitidos.has(companyPlan(company)));
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run:

```bash
cd mobile
npx vitest run src/features/company/company-plan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Atualizar a camada de dados**

Em `mobile/src/services/api.ts`:

1. Remova `MOCK_FEATURED_COMPANY` do import de `@/data/mock`.
2. Adicione o import:

```ts
import { filterCompaniesByPlan, type Plan } from '@/features/company/company-plan';
```

3. Substitua a função `getCompanies` inteira por:

```ts
export async function getCompanies(
  page = 1,
  pageSize = 20,
  city?: string,
  plans?: Plan[],
): Promise<CompanyPage> {
  const limitedPageSize = Math.min(pageSize, 50);
  const filtrarPorPlanos = (items: Company[]): Company[] =>
    plans && plans.length > 0 ? filterCompaniesByPlan(items, plans) : items;

  if (!isApiConfigured()) {
    if (!__DEV__) return { items: [], total: 0, page, pageSize: limitedPageSize };
    let items = MOCK_COMPANIES;
    if (city) {
      const target = normalizeCity(city);
      items = items.filter((c) => normalizeCity(c.city) === target);
    }
    items = filtrarPorPlanos(items);
    const start = (page - 1) * limitedPageSize;
    const sliced = items.slice(start, start + limitedPageSize);
    return { items: sliced, total: items.length, page, pageSize: limitedPageSize };
  }
  const params = new URLSearchParams({ page: String(page), pageSize: String(limitedPageSize) });
  if (city) params.set('city', city);
  if (plans && plans.length > 0) params.set('plan', plans.join(','));
  const payload = await request<Company>(`/companies?${params.toString()}`);
  const items = fromPaginated(payload, []);
  const total = isPaginated(payload) ? (payload.total ?? items.length) : items.length;
  const allowMockFallback = __DEV__;
  const mockItems = filtrarPorPlanos(MOCK_COMPANIES);
  const fallbackItems =
    page === 1 && items.length === 0 && allowMockFallback
      ? mockItems.slice(0, limitedPageSize)
      : items;
  const fallbackTotal =
    page === 1 && items.length === 0 && allowMockFallback ? mockItems.length : total;
  return { items: fallbackItems, total: fallbackTotal, page, pageSize: limitedPageSize };
}
```

4. Substitua a função `getFeaturedCompany` inteira por:

```ts
export async function getFeaturedCompanies(city?: string): Promise<Company[]> {
  const premiumMocks = (): Company[] =>
    __DEV__ ? filterCompaniesByPlan(MOCK_COMPANIES, ['premium']) : [];

  if (!isApiConfigured()) return premiumMocks();

  try {
    const params = new URLSearchParams({ plan: 'premium', page: '1', pageSize: '50' });
    if (city) params.set('city', city);
    const payload = await request<Company>(`/companies?${params.toString()}`);
    if (payload === null) return premiumMocks();
    return filterCompaniesByPlan(fromPaginated(payload, []), ['premium']);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return premiumMocks();
  }
}
```

- [ ] **Step 6: Atualizar os mocks**

Em `mobile/src/data/mock.ts`:

1. Remova `isFeatured: true,` da Construtora Alicerce.
2. No Restaurante Sabor & Arte, adicione `plan: 'basic',` depois de `category: '2',`.
3. Remova o export:

```ts
export const MOCK_FEATURED_COMPANY: Company =
  MOCK_COMPANIES.find((company) => company.isFeatured) ?? MOCK_COMPANIES[0];
```

- [ ] **Step 7: Atualizar o hook da home**

Em `mobile/src/features/home/use-home-data.ts`:

1. Troque o import `getFeaturedCompany` por `getFeaturedCompanies`.
2. No tipo `HomeData`, troque:

```ts
  featuredCompany: Company | null;
```

por:

```ts
  featuredCompanies: Company[];
```

3. No `INITIAL`, troque:

```ts
  featuredCompany: null,
```

por:

```ts
  featuredCompanies: [],
```

4. No `Promise.all`, troque `getFeaturedCompany(city)` por `getFeaturedCompanies(city)` e o destructuring `featuredCompany` por `featuredCompanies`.
5. No `setState`, troque `featuredCompany,` por `featuredCompanies,`.

- [ ] **Step 8: Atualizar a tela da home**

Em `mobile/src/app/(tabs)/index.tsx`:

1. Troque o import:

```ts
import { FeaturedCompany } from '@/features/home/featured-company';
```

por:

```ts
import { FeaturedCompanies } from '@/features/home/featured-companies';
```

2. Remova o import:

```ts
import { excludeFeaturedCompany } from '@/features/home/home-companies';
```

3. No destructuring do `useHomeData`, troque `featuredCompany` por `featuredCompanies`.
4. Remova o bloco:

```ts
  const visibleOtherCompanies = useMemo(
    () => excludeFeaturedCompany(otherCompanies, featuredCompany),
    [otherCompanies, featuredCompany],
  );
```

5. Na chamada de `getCompanies`, troque:

```ts
          getCompanies(1, 50, undefined, false),
```

por:

```ts
          getCompanies(1, 50, undefined, ['basic', 'free']),
```

6. No render, troque:

```tsx
              <FeaturedCompany company={featuredCompany} />
```

por:

```tsx
              <FeaturedCompanies companies={featuredCompanies} />
```

e troque `companies={visibleOtherCompanies}` por `companies={otherCompanies}`.

- [ ] **Step 9: Criar o carrossel de destaques**

Crie `mobile/src/features/home/featured-companies.tsx` com o conteúdo completo:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
import { PlanBadge } from '@/features/company/plan-badge';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { cityName } from '@/utils/city';
import { callPhone, openAddress, openWhatsApp } from '@/utils/links';
import { openCompanyDetails } from '../company/open-company';
import { SectionHeader } from './section-header';

const CARD_WIDTH = 300;

const FeaturedCompanyCard = memo(function FeaturedCompanyCard({ company }: { company: Company }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.companyCard}>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${company.name}`}
        onPress={() => openCompanyDetails(company._id)}
      >
        <View style={styles.companyCover}>
          <MaterialCommunityIcons name="office-building" size={48} color={Overlays.whiteSoft} />
          <View style={styles.highlightTag}>
            <Text style={styles.highlightTagText}>Destaque</Text>
          </View>
        </View>
        <View style={styles.companyBody}>
          <Text style={styles.companyName}>{company.name}</Text>
          <View style={styles.categoryRow}>
            <Text style={styles.companyCategory}>{categoryLabel(company.category)}</Text>
            <PlanBadge plan={company.plan} />
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.companyAddress}>{company.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.companyActions}>
        <TouchableOpacity
          style={styles.whatsappPill}
          activeOpacity={0.7}
          onPress={() => company.whatsapp && void openWhatsApp(company.whatsapp)}
          disabled={!company.whatsapp}
          accessibilityLabel={!company.whatsapp ? 'WhatsApp não disponível' : 'Abrir WhatsApp'}
        >
          <MaterialCommunityIcons name="whatsapp" size={16} color={colors.background} />
          <Text style={styles.whatsappPillText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={() => company.phone && void callPhone(company.phone)}
          disabled={!company.phone}
          accessibilityLabel={!company.phone ? 'Telefone não disponível' : 'Ligar'}
        >
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={styles.actionPillText}>Ligar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={() =>
            company.address && void openAddress(company.address, cityName(company.city))
          }
          disabled={!company.address}
          accessibilityLabel={!company.address ? 'Endereço não disponível' : 'Abrir endereço'}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.actionPillText}>Endereço</Text>
        </TouchableOpacity>
      </View>
      {!company.phone && !company.address && !company.whatsapp ? <ContactHintRow /> : null}
    </View>
  );
});

const renderFeaturedCompany = ({ item }: ListRenderItemInfo<Company>) => (
  <FeaturedCompanyCard company={item} />
);

const featuredCompanyKey = (company: Company) => company._id;

export function FeaturedCompanies({ companies }: { companies: Company[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (companies.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" />
      <FlatList
        horizontal
        data={companies}
        keyExtractor={featuredCompanyKey}
        renderItem={renderFeaturedCompany}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    carouselContent: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.two,
    },
    companyCard: {
      width: CARD_WIDTH,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    companyCover: {
      height: 120,
      backgroundColor: colors.coverPlaceholder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightTag: {
      position: 'absolute',
      top: Spacing.three,
      left: Spacing.three,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.two,
    },
    highlightTagText: {
      color: colors.background,
      ...Typography.caption,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
    },
    companyBody: {
      padding: Spacing.three,
      gap: Spacing.one,
    },
    companyName: {
      color: colors.text,
      ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    companyCategory: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
      marginTop: Spacing.half,
    },
    companyAddress: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    companyActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.one,
      marginTop: Spacing.three,
      marginBottom: Spacing.three,
      marginHorizontal: Spacing.two,
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.one,
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    actionPillText: {
      color: colors.primary,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    whatsappPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.one,
      backgroundColor: colors.whatsapp,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    whatsappPillText: {
      color: colors.background,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
```

- [ ] **Step 10: Remover os arquivos antigos**

```bash
rm mobile/src/features/home/featured-company.tsx
rm mobile/src/features/home/home-companies.ts
rm mobile/src/features/home/home-companies.test.ts
```

- [ ] **Step 11: Rodar testes, typecheck, lint e gate de tipografia**

Run:

```bash
cd mobile
npm test
npm run typecheck
npx expo lint
grep -rnE "fontSize:\s*[0-9]|fontWeight:\s*'[0-9]+'" src --include=*.ts --include=*.tsx | grep -v "src/constants/theme.ts" | grep -v "\.test\." || true
```

Expected: testes verdes; typecheck e lint OK; grep sem saída.

- [ ] **Step 12: Commit**

```bash
git add mobile/src/features/company/company-plan.ts mobile/src/features/company/company-plan.test.ts mobile/src/services/api.ts mobile/src/data/mock.ts mobile/src/features/home/use-home-data.ts mobile/src/app/'(tabs)'/index.tsx mobile/src/features/home/featured-companies.tsx
git add -u mobile/src/features/home/featured-company.tsx mobile/src/features/home/home-companies.ts mobile/src/features/home/home-companies.test.ts
git commit -m "feat(mobile): destaca empresas premium na home" -m "Generated-by: opencode (deepseek-v4.1-flash-free)"
```

---

## Task 5: Domínio — remover `isFeatured` das três cópias e fechar o gate

**Files:**
- Modify: `shared/domain.ts`
- Modify: `mobile/src/types/domain.ts`
- Modify: `admin/src/types/domain.ts`

- [ ] **Step 1: Remover o campo das três cópias**

Nos três arquivos, remova a linha:

```ts
  isFeatured?: boolean;
```

Os arquivos devem continuar com os mesmos campos, nomes e tipos.

- [ ] **Step 2: Confirmar que não sobrou referência**

Run:

```bash
grep -rn "isFeatured" backend/src mobile/src admin/src shared --include=*.ts --include=*.tsx || true
```

Expected: nenhuma saída.

- [ ] **Step 3: Rodar o gate completo dos três apps**

Run:

```bash
cd backend
npm run lint
npm run typecheck
npm test

cd ../admin
npm run lint
npm run typecheck
npm run build

cd ../mobile
npx expo lint
npm run typecheck
npm test
npx expo export
```

Expected: todos os comandos verdes; `expo export` conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add shared/domain.ts mobile/src/types/domain.ts admin/src/types/domain.ts
git commit -m "refactor(domain): remove isFeatured do contrato" -m "Generated-by: opencode (deepseek-v4.1-flash-free)"
```

---

## Verificação manual final

- [ ] No admin, abra uma empresa e mude o plano para `Premium`.
- [ ] No app, recarregue a home: a empresa deve aparecer no carrossel "Empresas em Destaque".
- [ ] Volte ao admin e mude a mesma empresa para `Básico` ou `Gratuito`.
- [ ] Recarregue a home: a empresa deve sair do carrossel e aparecer em "Outras Empresas", com básico antes de free.
- [ ] Abra uma empresa `Gratuito`: deve usar a tela enxuta.
- [ ] Abra uma empresa `Básico` e uma `Premium`: ambas devem usar a tela completa.

## Nota de deploy

Antes de publicar, rode no Mongo:

```js
db.companies.countDocuments({ isFeatured: true, plan: { $ne: 'premium' } })
```

Se o número for maior que zero, revise essas empresas: elas perderão o
destaque e a tela completa ao subir esta versão.
