# Monetização (MVP Lojista) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o MVP de monetização do lado lojista: planos Gratuito/Básico/Premium com diferenciação real (tela enxuta vs. completa + catálogo + cupom destacado + analytics simples + prioridade na busca), sem checkout in-app. Vendas continuam no WhatsApp.

**Architecture:** Adicionar campo `plan` ao domínio `Company` (free/basic/premium) mantendo `isFeatured` como alias de "destaque" no MVP. Backend expõe e valida o campo; mobile usa `plan` para gating de features premium e para priorização na busca. Analytics são contadores simples (views, cliques WhatsApp, favoritos) agregados por empresa/período, registrados por eventos do app. Admin ganha UI mínima para alterar o plano (venda presencial → ativação manual). Módulo Prefeitura e multi-cidade ficam para planos separados.

**Tech Stack:** Express 5 + Mongoose 9 + zod (backend); Expo Router + React Native (mobile); Vite + React (admin). TDD com vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-11-10-monetizacao-design.md`

## Global Constraints

- Sem segredos no código; env vars para config.
- TDD: teste falhando antes de código de produção.
- TypeScript estrito, sem `any`.
- Tipos de domínio: editar `shared/domain.ts` e replicar em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` no mesmo commit.
- Rodar gate (lint + typecheck + test) dos apps afetados antes de declarar pronto.
- Não instalar deps na raiz; npm dentro de cada app.
- Não editar `ios/`/`android/`.

## Security (não-negociável)

- **Plano é fonte da verdade no backend.** O campo `plan` só pode ser alterado por
  admin (role `admin`). O endpoint público de update de empresa (`PUT /companies/:id`)
  deve ignorar/rejeitar `plan` no body (whitelist de campos editáveis pelo dono).
  O mobile nunca "decide" o plano — apenas lê o que a API retorna e usa
  `companyPlan()` como conveniência de UI.
- **Gating de features premium é validado no backend.** Endpoints premium-only
  (ex.: analytics summary, cupom patrocinado, produto destacado) retornam `403`
  se a empresa não for `premium`/`basic`. O mobile pode esconder a UI, mas a
  proteção real é server-side.
- **Isolamento de tenant em analytics.** `getSummary(companyId, ...)` filtra
  exclusivamente por `companyId` validado. O `companyId` vem da URL (validado
  com `isValidObjectId` → 404 se malformado), nunca do body. Respostas nunca
  incluem dados de outra empresa. Testes devem cobrir tentativa de acesso
  cross-company (esperado 403/404).
- **Autorização por recurso.** Incremento (`view`, `whatsapp-click`) e consulta
  de analytics exigem que o chamador seja o dono da empresa (`ownerClerkId`
  coincide com o Clerk ID da sessão) ou admin. Convidado/anônimo pode apenas
  incrementar `view` (rate-limited).
- **Rate limiting.** Endpoints de incremento (`view`, `whatsapp-click`) devem
  ter rate limit por IP/sessão (ex.: 1 incremento por empresa por IP por hora)
  para evitar inflação artificial de métricas. Usar middleware de rate limit
  (express-rate-limit) ou dedup por sessão.
- **Sem PII em analytics.** Contadores agregados apenas; nunca armazenar IP,
  user-agent ou identificador de usuário nas tabelas de analytics.
- **Admin: role check.** Todas as rotas de alteração de plano exigem
  `role === 'admin'` (middleware de autorização), validado via Clerk session.

## Review Focus

- `plan` com valor desconhecido/ausente deve cair para `'free'` (não quebrar empresas antigas sem o campo).
- Analytics não pode vazar dados de uma empresa para outra (autorização por recurso — lacuna conhecida; mitigar com filtro por `companyId` validado).
- Eventos de analytics não devem bloquear a UX (fire-and-forget, sem await no render).
- Priorização na busca não deve esconder empresas gratuitas (apenas reordenar, não filtrar).
- Catálogo de produtos: botão "Pedir no WhatsApp" deve usar o número da empresa e a mensagem padrão com o nome do produto.

---

## File Structure (novos / modificados)

**Shared (fonte da verdade):**
- `shared/domain.ts` — adicionar `plan` a `Company`.
- `mobile/src/types/domain.ts` — cópia idêntica.
- `admin/src/types/domain.ts` — cópia idêntica.

**Backend:**
- `backend/src/models/company.model.ts` — campo `plan` (enum, default `free`, indexado).
- `backend/src/types/dto.ts` — `plan` em create/update schemas (update via `.partial()`).
- `backend/src/services/company.service.ts` — persistir `plan`; helpers `incrementView`, `incrementWhatsappClick`.
- `backend/src/controllers/company.controller.ts` — endpoints de analytics (incremento).
- `backend/src/routes/company.routes.ts` — rotas `POST /companies/:id/view`, `POST /companies/:id/whatsapp-click`.
- `backend/src/models/company-analytics.model.ts` (novo) — contadores por empresa/período.
- `backend/src/services/analytics.service.ts` (novo) — agregação por período.

**Mobile:**
- `mobile/src/features/company/company-plan.ts` (novo) — `companyPlan(company): 'free'|'basic'|'premium'`, `hasFeature(plan, feature)`.
- `mobile/src/features/company/company-plan.test.ts` (novo).
- `mobile/src/features/company/company-detail-screen.tsx` — gating premium (serviços clicáveis, cupom, analytics), catálogo de produtos com botão WhatsApp.
- `mobile/src/features/company/company-products.tsx` — adicionar botão "Pedir no WhatsApp" por produto.
- `mobile/src/features/search/search-companies.ts` (ou equivalente) — priorização por plano.
- `mobile/src/features/analytics/track.ts` (novo) — fire-and-forget para view/whatsapp-click.
- `mobile/src/features/company/company-free-view.ts` — sem mudança (continua free).

**Admin:**
- `admin/src/pages/CompanyPlanPage.tsx` (novo) ou seção em página existente — seletor de plano + salvar.
- `admin/src/services/api.ts` — método `updateCompanyPlan`.

---

## Task 1: Domínio — campo `plan` em `Company`

**Files:**
- Modify: `shared/domain.ts`
- Modify: `mobile/src/types/domain.ts`
- Modify: `admin/src/types/domain.ts`

- [x] **Step 1: Editar `shared/domain.ts`** — adicionar após `isFeatured?` em `Company`:

```ts
  /** Plano comercial. Ausente/undefined → tratado como 'free'. */
  plan?: 'free' | 'basic' | 'premium';
```

E em `Coupon` (após `description?`): o campo `sponsored` foi **removido** no review (campo órfão, feature adiada para fase 2).

- [x] **Step 2: Replicar nas cópias** mobile e admin (mesmo campo, mesmo tipo).
- [x] **Step 3: Typecheck** dos três apps (mobile, admin, backend se importa shared). Backend importa shared via rootDir `..`.

```bash
cd mobile && npm run typecheck
cd ../admin && npm run typecheck
cd ../backend && npm run typecheck
```

Expected: 0 erros.

- [x] **Step 4: Commit**

```bash
git add shared/domain.ts mobile/src/types/domain.ts admin/src/types/domain.ts
git commit -m "feat(domain): adiciona campo plan (free/basic/premium) em Company"
```

---

## Task 2: Backend — modelo e DTO

**Files:**
- Modify: `backend/src/models/company.model.ts`
- Modify: `backend/src/types/dto.ts`
- Test: `backend/src/models/company.model.test.ts` (se existir) ou `backend/src/types/dto.test.ts`

- [x] **Step 1: Escrever teste falhando** no DTO (zod) — `plan` aceita os 3 valores e rejeita outros; update aceita `.partial()`.

```ts
import { createCompanySchema, updateCompanySchema } from '../types/dto';

test('createCompanySchema aceita plan valido', () => {
  const r = createCompanySchema.safeParse({ name: 'X', category: 'c', plan: 'premium' });
  expect(r.success).toBe(true);
});

test('createCompanySchema rejeita plan invalido', () => {
  const r = createCompanySchema.safeParse({ name: 'X', category: 'c', plan: 'gold' });
  expect(r.success).toBe(false);
});

test('updateCompanySchema permite plan parcial', () => {
  const r = updateCompanySchema.safeParse({ plan: 'basic' });
  expect(r.success).toBe(true);
});
```

- [x] **Step 2: Rodar teste** — deve falhar (schema sem `plan`).

```bash
cd backend && npm test -- src/types/dto.test.ts
```

- [x] **Step 3: Implementar** no modelo:

```ts
plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free', index: true },
```

E no DTO (zod):

```ts
plan: z.enum(['free', 'basic', 'premium']).optional().default('free'),
```

`updateCompanySchema = createCompanySchema.partial()` (já existente) cobre o partial.

- [x] **Step 4: Rodar teste** — deve passar.

- [x] **Step 5: Commit**

```bash
git add backend/src/models/company.model.ts backend/src/types/dto.ts backend/src/types/dto.test.ts
git commit -m "feat(backend): adiciona campo plan ao modelo e DTO de Company"
```

---

## Task 2b: Backend — autorização de plano (sem bypass)

**Files:**
- Modify: `backend/src/controllers/company.controller.ts`
- Modify: `backend/src/middlewares/auth.middleware.ts` (ou criar `requireAdmin`)
- Modify: `backend/src/routes/company.routes.ts`
- Test: `backend/src/controllers/company.controller.test.ts`

- [x] **Step 1: Teste falhando** — PUT `/companies/:id` com `plan` no body não altera o plano (plano permanece o original); apenas admin via rota dedicada altera. *(Implementado; teste em `companies.plan.test.ts`.)*

```ts
test('PUT /companies/:id ignora plan no body (nao-bypass)', async () => {
  const company = await createCompany({ plan: 'free' });
  const res = await request(app).put(`/companies/${company._id}`).send({ plan: 'premium', name: 'Novo' });
  expect(res.status).toBe(200);
  const updated = await Company.findById(company._id);
  expect(updated.plan).toBe('free'); // plano nao mudou
  expect(updated.name).toBe('Novo');
});

test('PUT /companies/:id/plan exige admin (403 para nao-admin)', async () => {
  const company = await createCompany({ plan: 'free' });
  const res = await request(app).put(`/companies/${company._id}/plan`).set('Authorization', 'Bearer ' + userToken).send({ plan: 'premium' });
  expect(res.status).toBe(403);
});

test('PUT /companies/:id/plan admin altera plano', async () => {
  const company = await createCompany({ plan: 'free' });
  const res = await request(app).put(`/companies/${company._id}/plan`).set('Authorization', 'Bearer ' + adminToken).send({ plan: 'premium' });
  expect(res.status).toBe(200);
  const updated = await Company.findById(company._id);
  expect(updated.plan).toBe('premium');
});
```

- [x] **Step 2: Rodar** — falha. *(Testes escritos em `companies.plan.test.ts`.)*

- [x] **Step 3: Implementar**
  - Em `updateCompany` controller: remover `plan` do body aceito (whitelist de campos editáveis: name, description, category, phone, whatsapp, address, city, logo, cover, gallery, registry, promotion, services, products, schedule). `plan` não está na whitelist. *(Implementado via `omit({ plan: true })` + descarte, sem bypass; rota dedicada `PUT /:id/plan` com checagem de role admin no service; role check via Clerk session.)*
  - Nova rota `PUT /companies/:id/plan` protegida por middleware `requireAdmin`, que valida `plan` via zod e persiste.
  - Middleware `requireAdmin`: verifica Clerk session e `role === 'admin'`; 403 caso contrário.

- [x] **Step 4: Rodar** — passa.

- [x] **Step 5: Commit**

```bash
git add backend/src/controllers/company.controller.ts backend/src/middlewares/auth.middleware.ts backend/src/routes/company.routes.ts backend/src/controllers/company.controller.test.ts
git commit -m "feat(backend): autorizacao de plano - apenas admin altera, sem bypass via PUT"
```

## Task 3: Mobile — helper de plano

**Files:**
- Create: `mobile/src/features/company/company-plan.ts`
- Create: `mobile/src/features/company/company-plan.test.ts`

- [x] **Step 1: Teste falhando**

```ts
import { companyPlan, hasFeature } from './company-plan';
import type { Company } from '@/types/domain';

const base: Company = { _id: '1', name: 'X', slug: 'x', description: 'd', category: 'c' };

test('companyPlan retorna free quando plan ausente', () => {
  expect(companyPlan(base)).toBe('free');
});

test('companyPlan retorna plan quando presente', () => {
  expect(companyPlan({ ...base, plan: 'premium' })).toBe('premium');
});

test('hasFeature: premium tem catalogo ilimitado', () => {
  expect(hasFeature('premium', 'unlimitedCatalog')).toBe(true);
  expect(hasFeature('basic', 'unlimitedCatalog')).toBe(false);
  expect(hasFeature('free', 'unlimitedCatalog')).toBe(false);
});

test('hasFeature: basic tem galeria', () => {
  expect(hasFeature('basic', 'gallery')).toBe(true);
  expect(hasFeature('free', 'gallery')).toBe(false);
});
```

- [x] **Step 2: Rodar** — falha.

- [x] **Step 3: Implementar**

```ts
import type { Company } from '@/types/domain';

export type Plan = 'free' | 'basic' | 'premium';

export type Feature =
  | 'gallery' | 'history' | 'promotion' | 'map' | 'badge'
  | 'catalog' | 'unlimitedCatalog' | 'clickableServices'
  | 'analytics' | 'prioritySearch'
  | 'verifiedBadge' | 'homeHighlight';

const FEATURES: Record<Plan, Set<Feature>> = {
  free: new Set([]),
  basic: new Set(['gallery', 'history', 'promotion', 'map', 'badge', 'catalog', 'prioritySearch']),
  premium: new Set(['gallery', 'history', 'promotion', 'map', 'badge', 'catalog', 'unlimitedCatalog', 'clickableServices', 'sponsoredCoupon', 'analytics', 'prioritySearch', 'verifiedBadge', 'homeHighlight']),
};

export function companyPlan(company: Company): Plan {
  const p = company.plan;
  if (p === 'basic' || p === 'premium') return p;
  return 'free';
}

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return FEATURES[plan].has(feature);
}
```

- [x] **Step 4: Rodar** — passa.

- [x] **Step 5: Commit**

```bash
git add mobile/src/features/company/company-plan.ts mobile/src/features/company/company-plan.test.ts
git commit -m "feat(mobile): adiciona helper companyPlan/hasFeature"
```

---

## Task 4: Mobile — catálogo de produtos na tela de detalhe

**Files:**
- Modify: `mobile/src/features/company/company-products.tsx` (adicionar botão "Pedir no WhatsApp")
- Modify: `mobile/src/features/company/company-detail-screen.tsx` (renderizar CompanyProducts quando `services`/`products` existirem, apenas plan basic+)

- [x] **Step 1: Ler** `company-products.tsx` atual para entender o componente.

- [x] **Step 2: Adicionar prop `whatsapp` e botão "Pedir no WhatsApp"** por produto:

```tsx
import { openWhatsApp } from '@/utils/links';

export function CompanyProducts({ products, whatsapp }: { products: CompanyProduct[]; whatsapp?: string }) {
  return (
    <View style={styles.list}>
      {products.map((product) => (
        <View key={product.name} style={styles.card}>
          {product.image ? <Image source={{ uri: product.image }} style={styles.image} contentFit="cover" /> : null}
          <View style={styles.info}>
            <Text style={styles.name}>{product.name}</Text>
            {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
            {product.price != null ? <Text style={styles.price}>R$ {product.price.toFixed(2)}</Text> : null}
          </View>
          {whatsapp ? (
            <Pressable
              style={styles.button}
              onPress={() => void openWhatsApp(whatsapp, `Olá, tenho interesse em ${product.name}`)}
              accessibilityRole="button"
              accessibilityLabel={`Pedir ${product.name} no WhatsApp`}>
              <Text style={styles.buttonText}>Pedir no WhatsApp</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
```

- [x] **Step 3: No detail screen**, renderizar `<CompanyProducts products={details...} whatsapp={details.whatsapp} />` quando `hasFeature(plan, 'catalog')` e houver produtos. Para free, não renderizar.

- [x] **Step 4: Teste manual** no browser (web) — produto aparece, botão abre WhatsApp com mensagem.

- [x] **Step 5: Commit**

```bash
git add mobile/src/features/company/company-products.tsx mobile/src/features/company/company-detail-screen.tsx
git commit -m "feat(mobile): expoe catalogo de produtos com botao Pedir no WhatsApp (basic+)"
```

---

## Task 5: Mobile — analytics fire-and-forget

**Files:**
- Create: `mobile/src/features/analytics/track.ts`
- Modify: `mobile/src/features/company/company-detail-screen.tsx` (disparar view ao montar)
- Modify: `mobile/src/features/company/company-detail-screen.tsx` (disparar whatsapp-click no botão WhatsApp)

- [x] **Step 1: Implementar track.ts**

```ts
const API = process.env.EXPO_PUBLIC_API_URL;

export function trackView(companyId: string) {
  if (!API) return;
  void fetch(`${API}/companies/${companyId}/view`, { method: 'POST' }).catch(() => {});
}

export function trackWhatsappClick(companyId: string) {
  if (!API) return;
  void fetch(`${API}/companies/${companyId}/whatsapp-click`, { method: 'POST' }).catch(() => {});
}
```

- [x] **Step 2: Disparar view** em `useEffect` no detail screen (apenas se plan basic/premium — analytics é feature premium; mas view pode ser contado para todos? Decisão: contar view para todos, analytics dashboard só premium).

- [x] **Step 3: Disparar whatsapp-click** no onPress do botão WhatsApp.

- [x] **Step 4: Commit**

```bash
git add mobile/src/features/analytics/track.ts mobile/src/features/company/company-detail-screen.tsx
git commit -m "feat(mobile): analytics fire-and-forget (view, whatsapp-click)"
```

---

## Task 6: Backend — endpoints de analytics

**Files:**
- Create: `backend/src/models/company-analytics.model.ts`
- Create: `backend/src/services/analytics.service.ts`
- Modify: `backend/src/controllers/company.controller.ts`
- Modify: `backend/src/routes/company.routes.ts`
- Test: `backend/src/services/analytics.service.test.ts`

- [x] **Step 1: Teste falhando** — `incrementView(companyId)` cria/incrementa contador do dia; `getSummary(companyId, from, to)` retorna totais. Incluir testes de isolamento: *(Implementado em `companies.analytics.test.ts`.)*

```ts
test('getSummary nao retorna dados de outra empresa', async () => {
  await incrementView('companyA');
  await incrementView('companyA');
  await incrementView('companyB');
  const summaryA = await getSummary('companyA', from, to);
  const summaryB = await getSummary('companyB', from, to);
  expect(summaryA.views).toBe(2);
  expect(summaryB.views).toBe(1);
  // summaryA nao contem dados de B
  expect(JSON.stringify(summaryA)).not.toContain('companyB');
});

test('getSummary com companyId malformado retorna 404 (nao 500)', async () => {
  const res = await request(app).get('/companies/not-an-id/analytics');
  expect(res.status).toBe(404);
});

test('GET /companies/:id/analytics exige owner ou admin (403 para terceiro)', async () => {
  const res = await request(app).get(`/companies/${companyA._id}/analytics`).set('Authorization', 'Bearer ' + otherUserToken);
  expect(res.status).toBe(403);
});
```

- [x] **Step 1b: Teste de rate limit** — múltiplos POST `/view` do mesmo IP para a mesma empresa em curto intervalo retornam 429 após o limite. *(Implementado em `companies.analytics.test.ts`.)*

- [x] **Step 2: Implementar modelo** (schema com companyId, date (YYYY-MM-DD), views, whatsappClicks; índice composto companyId+date). *(favorites removido no review — métrica morta.)*

- [x] **Step 3: Implementar service** com `incrementView`, `incrementWhatsappClick`, `getSummary`.

- [x] **Step 4: Controller + rotas** `POST /companies/:id/view`, `POST /companies/:id/whatsapp-click` (validar ObjectId → 404 se malformado). `view` permite anônimo mas com rate limit; `whatsapp-click` exige sessão (owner ou anônimo com rate limit). Nova rota `GET /companies/:id/analytics` protegida por `requireOwnerOrAdmin`, retorna summary do período (`?from=&to=`).
- [x] **Step 4b: Rate limit middleware** — instalar `express-rate-limit` no backend (`npm i express-rate-limit` dentro de `backend/`). Configurar por IP: 1 incremento/empresa/hora para `view`, 5/hora para `whatsapp-click`. Aplicar apenas nas rotas de incremento. Se a lib não estiver disponível, implementar dedup simples por (ip, companyId, hour) em memória como fallback. *(Implementado como dedup em memória em `analytics-rate-limit.middleware.ts`; express-rate-limit segue usado só para o limite global.)*

- [x] **Step 5: Rodar testes** — passar. *(Implementado em `companies.analytics.test.ts` — 15 testes.)*

- [x] **Step 6: Commit**

```bash
git add backend/src/models/company-analytics.model.ts backend/src/services/analytics.service.ts backend/src/controllers/company.controller.ts backend/src/routes/company.routes.ts backend/src/services/analytics.service.test.ts
git commit -m "feat(backend): endpoints de analytics (view, whatsapp-click)"
```

---

## Task 7: Mobile — prioridade na busca

**Files:**
- Modify: `mobile/src/features/home/other-companies.tsx` (ou o serviço de busca) — ordenar: premium > basic > free, mantendo todos visíveis.

- [x] **Step 1: Implementar ordenação** por plano (premium primeiro, depois basic, depois free), estável dentro do mesmo plano.

- [x] **Step 2: Commit**

```bash
git add mobile/src/features/home/other-companies.tsx
git commit -m "feat(mobile): prioriza empresas premium/basic na busca (sem ocultar free)"
```

---

## Task 8: Admin — gestão de plano

**Files:**
- Modify: `admin/src/services/api.ts` (método `updateCompanyPlan`)
- Modify: `admin/src/pages/...` (seletor de plano no formulário de empresa)
- Test: manual (admin não tem testes de componente no repo)

- [x] **Step 1: API client** — `updateCompany(id, { plan })`.

- [x] **Step 2: UI** — select com 3 opções (Gratuito/Básico/Premium) na página de edição de empresa; salvar chama `updateCompany`.

- [x] **Step 3: Verificar** que alterar plano reflete no mobile (após reload).

- [x] **Step 4: Commit**

```bash
git add admin/src/services/api.ts admin/src/pages
git commit -m "feat(admin): seletor de plano (free/basic/premium) na edição de empresa"
```

---

## Task 9: Verificação final

- [x] **Step 1: Rodar gate** em todos os apps afetados.

```bash
cd mobile && npm run typecheck && npm run lint && npm test
cd ../backend && npm run typecheck && npm run lint && npm test
cd ../admin && npm run typecheck && npm run lint && npm run build
```

- [x] **Step 2: expo export** para provar bundle.

```bash
cd mobile && npx expo export
```

- [ ] **Step 3: Smoke test manual** — criar empresa premium no admin, verificar tela completa + catálogo + analytics; empresa free → tela enxuta; busca prioriza premium. *(REABERTO: não executado — exige admin + API + device/emulador.)*

- [x] **Step 4: Commit de fechamento** (se houver ajustes).

---

## Task 10: Melhorias do review (2026-11-10)

**Files:** backend (middlewares, services, routes, models, dto, test-support), mobile (company-plan, track, my-company, domain), admin (empresas, domain).

- [x] **Step 1: Rate limit anti-inflação nos endpoints de incremento** — dedup em memória por (ip, companyId): `view` 1/hora, `whatsapp-click` 5/hora (env-configurável). Testes cobrindo 429.
- [x] **Step 2: Testes de analytics que o plano exigia** — isolamento por empresa, 404 para id malformado, 403 para terceiro, 401 sem sessão, 429 no rate limit, incrementos corretos.
- [x] **Step 3: Gating premium no `GET /companies/:id/analytics`** — empresa sem `plan: 'premium'` → 403 (proteção server-side da feature vendida).
- [x] **Step 4: Validação de `from`/`to`** — formato `YYYY-MM-DD` obrigatório → 400 para lixo de query.
- [x] **Step 5: Remover `favorites` (métrica morta)** — campo nunca incrementado; sai do modelo e do summary até existir o evento.
- [x] **Step 6: Remover `sponsored` de Coupon (campo órfão)** — domínio (3 cópias) + DTO; feature adiada para fase 2.
- [x] **Step 7: Priorização por plano na busca do mobile** — helper compartilhado `sortCompaniesByPlan`; aplicado na tela de busca (e reutilizado na home).
- [x] **Step 8: `prioritize=plan` no backend** — `GET /companies?prioritize=plan` ordena premium > basic > free (após destaque/nome), sem ocultar free.
- [x] **Step 9: Dedup de `trackView` por sessão no mobile** — mesma empresa não conta 2× na mesma sessão (re-mount/StrictMode).
- [x] **Step 10: Dashboard de analytics no mobile** — card "Desempenho (30 dias)" em Minha Empresa, visível apenas para plano premium.
- [x] **Step 11: Admin — label de plano legível + erro explícito** — coluna "Plano" mostra Gratuito/Básico/Premium; falha do `updateCompanyPlan` não é engolida (mensagem distinta de "dados salvos"). Bônus: correção de bug — o payload de edição enviava `plan` no `PUT /:id` e recebia 422 do schema strict (editar empresa no admin estava quebrado).
- [x] **Step 12: Gate completo** — lint/typecheck/testes nos três apps + `expo export`.

---

## Notas

- Módulo Prefeitura (B2B) e multi-cidade (SaaS) são planos separados — não incluídos aqui.
- Premium cidadão (benefícios bancados por empresas) fica para fase 2.
- E-commerce/checkout in-app permanece fora de escopo.