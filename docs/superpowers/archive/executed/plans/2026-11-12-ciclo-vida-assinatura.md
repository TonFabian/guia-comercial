# Ciclo de Vida de Assinatura (planStartedAt / planExpiresAt) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar vigência ao plano comercial (`planStartedAt`/`planExpiresAt`), job diário que rebaixa planos vencidos e notificação proativa ao lojista (e-mail SMTP + push Expo), com gestão de datas no admin.

**Architecture:** Datas como string `YYYY-MM-DD` (data pura, sem fuso) em `Company` (fonte da verdade) + coleção `PlanNotification` com índice único para dedup de avisos (claim-first). `plan-lifecycle.service.ts` concentra o núcleo puro (`computeAction`) e a orquestração (`runPlanLifecycle`), agendada por `node-cron` em `index.ts` (07:00, `America/Sao_Paulo`). E-mails saem por `email.service.ts` (transporte `smtp` provisório via nodemailer; `http` para o serviço próprio futuro), sempre com `sanitize-html`. Push sai por `push.service.ts` (extração do fetch inline do broadcast + funções direcionadas).

**Tech Stack:** Express 5 + Mongoose 9 + zod 4 + node-cron + nodemailer + sanitize-html (backend); Vite + React (admin); vitest + supertest (testes).

**Spec:** `docs/superpowers/specs/2026-11-12-ciclo-vida-assinatura-design.md` (o plano argumenta a partir da spec; ler os dois).

## Global Constraints

- TDD: teste falhando antes de código de produção; teste de comportamento, não de implementação.
- TypeScript estrito, sem `any` (`unknown` + narrowing); `import type` para tipos.
- Tipos de domínio: editar `shared/domain.ts` e replicar em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` **no mesmo commit**.
- Fuso único do guia: horário de Brasília (BRT, UTC-3) via identificador canônico **`America/Sao_Paulo`** — `America/Brasilia` NÃO é aceito pelo ICU do Node (`RangeError: Invalid time zone`). Datas comparadas como string `YYYY-MM-DD`; "hoje" vem de `todayInBrasilia()` (`backend/src/utils/event-date.ts`, renomeada em `0dc6081`).
- Semântica de vigência: plano vigente enquanto `hoje < planExpiresAt`; o dia `planExpiresAt` é o dia do rebaixamento; `planExpiresAt` ausente = sem vencimento; após downgrade as datas permanecem.
- `PUT /companies/:id` (dono) NUNCA aceita `plan`/`planStartedAt`/`planExpiresAt` (zod descarta); só admin altera via `PUT /companies/:id/plan`.
- Sem segredos no código; novas env vars vão para `backend/.env.example`.
- Não instalar deps na raiz; `npm i` dentro de `backend/`. Não editar `ios/`/`android/`.
- Sem `console.log` sobrando; erros tipados com `statusCode`.
- O backend responde 422 para payload inválido (padrão real do repo via `validateBody`), 400/403/404 conforme a regra.

## Review Focus

- **Fuso**: qualquer `Intl.DateTimeFormat`/`node-cron` novo DEVE usar `America/Sao_Paulo` — `America/Brasilia` quebra em runtime (`Invalid time zone`). Teste: `backend/src/utils/event-date.test.ts` já cobre o helper; o cron usa o mesmo fuso.
- **D-0 = rebaixamento**: no dia `planExpiresAt` o plano JÁ está vencido (vale até a véspera). Teste: matriz de `computeAction` (`hoje === expiresAt` → `expired`).
- **Duplicação de aviso**: segunda execução do ciclo no mesmo dia não pode reenviar (índice único de `PlanNotification` → 11000 = pulado). Teste: integração roda 2× e afirma contagem.
- **Escalada de privilégio**: dono manda `planExpiresAt` no `PUT /companies/:id` → campo descartado (200, dados inalterados). Teste de regressão na Task 5.
- **HTML de e-mail com dados de usuário**: nome da empresa com `<script>` sai sanitizado. Teste: `email.service` captura a saída (Task 7).

---

## File Structure (novos / modificados)

**Shared:** `shared/domain.ts` + cópias `mobile/src/types/domain.ts`, `admin/src/types/domain.ts` — campos em `Company`.

**Backend:** `models/company.model.ts` (campos + índice parcial) · `models/plan-notification.model.ts` (novo) · `types/dto.ts` (updatePlanSchema com datas) · `services/company.service.ts` (`updateCompanyPlan` com datas) · `services/email.service.ts` (novo) · `services/push.service.ts` (novo) · `services/plan-lifecycle.service.ts` (novo) · `controllers/push-token.controller.ts` (broadcast usa push.service) · `index.ts` (cron) · `.env.example`.

**Admin:** `services/api.ts` (`updateCompanyPlan` com payload) · `components/sections/empresas.tsx` (datas no formulário + vigência na listagem).

---

### Task 1: Domínio — `planStartedAt`/`planExpiresAt` em `Company`

**Files:**
- Modify: `shared/domain.ts` (após `plan?`, linha ~54)
- Modify: `mobile/src/types/domain.ts` (mesma posição)
- Modify: `admin/src/types/domain.ts` (mesma posição)

**Interfaces:**
- Produces: `Company.planStartedAt?: string` e `Company.planExpiresAt?: string` (YYYY-MM-DD), usados por todas as tasks seguintes.

- [ ] **Step 1: Editar os três arquivos de domínio** — adicionar em `Company`, logo após o campo `plan?`:

```ts
  /** Início do período do plano atual (YYYY-MM-DD, data pura, sem fuso). */
  planStartedAt?: string;
  /** Dia do vencimento (YYYY-MM-DD). O plano vale ATÉ a véspera; neste dia o
   * cron rebaixa para 'free'. Ausente/undefined = plano sem vencimento. */
  planExpiresAt?: string;
```

- [ ] **Step 2: Typecheck dos três apps**

```bash
cd backend; npm run typecheck
cd ../mobile; npm run typecheck
cd ../admin; npm run typecheck
```

Expected: 0 erros (o teste de equivalência de domínio `domain-equivalence.test.ts` valida as cópias).

- [ ] **Step 3: Commit**

```bash
git add shared/domain.ts mobile/src/types/domain.ts admin/src/types/domain.ts
git commit -m "feat(domain): adiciona planStartedAt/planExpiresAt (YYYY-MM-DD) em Company"
```

---

### Task 2: Backend — modelo de Company (campos + índice parcial)

**Files:**
- Modify: `backend/src/models/company.model.ts`
- Test: `backend/src/models/company.model.test.ts` (novo — puro, sem banco)

**Interfaces:**
- Consumes: campos do domínio (Task 1).
- Produces: `CompanyModel` com paths `planStartedAt`/`planExpiresAt` (String) e índice parcial em `planExpiresAt`.

- [ ] **Step 1: Teste falhando** — `backend/src/models/company.model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { CompanyModel } from './company.model.js';

describe('company.model — vigência do plano', () => {
  it('declara planStartedAt e planExpiresAt como String', () => {
    expect(CompanyModel.schema.path('planStartedAt')?.instance).toBe('String');
    expect(CompanyModel.schema.path('planExpiresAt')?.instance).toBe('String');
  });

  it('tem índice parcial em planExpiresAt restrito a planos pagos com data', () => {
    const indice = CompanyModel.schema.indexes().find(
      ([chaves]) => 'planExpiresAt' in chaves,
    );
    expect(indice).toBeTruthy();
    const opcoes = indice?.[1] as { partialFilterExpression?: Record<string, unknown> };
    expect(opcoes.partialFilterExpression?.plan).toEqual({ $in: ['basic', 'premium'] });
    expect(opcoes.partialFilterExpression?.planExpiresAt).toEqual({ $type: 'string' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/models/company.model.test.ts
```

Expected: FAIL (paths não declarados).

- [ ] **Step 3: Implementar** em `backend/src/models/company.model.ts`, após `plan:`:

```ts
    planStartedAt: String,
    planExpiresAt: String,
```

E após o schema (antes do `export`), o índice parcial (não combine `sparse` com `partialFilterExpression` — Mongo rejeita):

```ts
// Índice parcial: cobre só documentos com plano pago e data de vencimento —
// exatamente a query diária do ciclo de planos.
companySchema.index(
  { planExpiresAt: 1 },
  {
    partialFilterExpression: {
      plan: { $in: ['basic', 'premium'] },
      planExpiresAt: { $type: 'string' },
    },
  },
);
```

- [ ] **Step 4: Rodar e ver passar** (mesmo comando). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/company.model.ts backend/src/models/company.model.test.ts
git commit -m "feat(backend): vigencia do plano no modelo de Company (campos + indice parcial)"
```

---

### Task 3: Backend — DTO do `PUT /:id/plan` com datas

**Files:**
- Modify: `backend/src/types/dto.ts`
- Test: `backend/src/types/dto.test.ts` (arquivo existente — acrescentar describe)

**Interfaces:**
- Consumes: `dataDiaSchema` (já existe em `dto.ts`, declarado em ~L420 — MOVER para antes de `updatePlanSchema`, pois `const` tem TDZ).
- Produces: `UpdatePlanDto = { plan; planStartedAt?: string | null; planExpiresAt?: string | null }`.

- [ ] **Step 1: Teste falhando** — acrescentar em `backend/src/types/dto.test.ts`:

```ts
import { updatePlanSchema } from '../types/dto';

describe('updatePlanSchema — datas de vigência', () => {
  it('aceita datas no formato YYYY-MM-DD', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planStartedAt: '2026-11-01', planExpiresAt: '2026-12-31' });
    expect(r.success).toBe(true);
  });

  it('rejeita formato inválido com 422 (ZodError do validateBody)', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planExpiresAt: '31/12/2026' });
    expect(r.success).toBe(false);
  });

  it('rejeita data de calendário inexistente (2026-02-30)', () => {
    const r = updatePlanSchema.safeParse({ plan: 'premium', planExpiresAt: '2026-02-30' });
    expect(r.success).toBe(false);
  });

  it('null limpa a data; ausente (undefined) mantém', () => {
    const limpa = updatePlanSchema.safeParse({ plan: 'free', planExpiresAt: null });
    expect(limpa.success).toBe(true);
    if (limpa.success) expect(limpa.data.planExpiresAt).toBeNull();
    const mantem = updatePlanSchema.safeParse({ plan: 'premium' });
    expect(mantem.success).toBe(true);
    if (mantem.success) expect(mantem.data.planExpiresAt).toBeUndefined();
  });

  it('rejeita fim anterior ao início quando ambos vêm no body', () => {
    const r = updatePlanSchema.safeParse({ plan: 'basic', planStartedAt: '2026-12-01', planExpiresAt: '2026-11-30' });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/types/dto.test.ts
```

Expected: FAIL (schema sem as datas).

- [ ] **Step 3: Implementar** em `backend/src/types/dto.ts`:
  1. **Mover** o bloco `dataDiaSchema` + `ehDataDeCalendario` (linhas ~418-433) para logo acima de `updatePlanSchema` (TDZ: `updatePlanSchema` está antes) e exportar: `export const dataDiaSchema = ...` (os schemas de evento continuam usando o mesmo const movido).
  2. Substituir `updatePlanSchema`:

```ts
/** Schema dedicado para alteração de plano/vigência (rota admin-only).
 * `undefined` no body = mantém a data gravada; `null` = limpa (sem vencimento). */
export const updatePlanSchema = z
  .object({
    plan: z.enum(['free', 'basic', 'premium']),
    planStartedAt: dataDiaSchema.nullable().optional(),
    planExpiresAt: dataDiaSchema.nullable().optional(),
  })
  .superRefine((payload, ctx) => {
    const { planStartedAt, planExpiresAt } = payload;
    if (
      typeof planStartedAt === 'string' &&
      typeof planExpiresAt === 'string' &&
      planExpiresAt < planStartedAt
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['planExpiresAt'],
        message: 'data de vencimento não pode ser anterior à data de início',
      });
    }
  });

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
```

  3. **Nada muda em `updateCompanySchema`**: as datas não estão em `createCompanySchema`, logo o zod do PUT público as DESCARTA (guard anti-escalada por descarte — comportamento já existente para `plan`).

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/types/dto.ts backend/src/types/dto.test.ts
git commit -m "feat(backend): PUT de plano aceita datas de vigencia (YYYY-MM-DD, null limpa)"
```

---

### Task 4: Backend — `updateCompanyPlan` persiste as datas

**Files:**
- Modify: `backend/src/services/company.service.ts` (`updateCompanyPlan`, linha ~303)
- Modify: `backend/src/controllers/company.controller.ts` (`updatePlan`, linha ~53)
- Test: `backend/src/routes/companies.plan.test.ts` (acrescentar `it`s ao describe de plano)

**Interfaces:**
- Consumes: `UpdatePlanDto` (Task 3).
- Produces: `updateCompanyPlan(id: string, payload: UpdatePlanDto, clerkId?: string)` — assinatura nova usada pelo controller.

- [ ] **Step 1: Teste falhando** — acrescentar em `companies.plan.test.ts` (padrão do arquivo: modelos em memória + `request(app)`; empresa premium precisa de `ownerClerkId`/User admin conforme fixtures já presentes):

```ts
it('admin define datas de vigência junto do plano', async () => {
  const res = await request(app)
    .put(`/api/companies/${ID_EMPRESA}/plan`)
    .set('Authorization', 'Bearer token_admin')
    .send({ plan: 'premium', planStartedAt: '2026-11-01', planExpiresAt: '2026-12-31' });
  expect(res.status).toBe(200);
  expect(res.body.planStartedAt).toBe('2026-11-01');
  expect(res.body.planExpiresAt).toBe('2026-12-31');
});

it('enviar só planExpiresAt que deixa fim < início GRAVADO → 422', async () => {
  // pré-condição: empresa com planStartedAt 2026-11-01 gravado (seed do teste)
  const res = await request(app)
    .put(`/api/companies/${ID_EMPRESA}/plan`)
    .set('Authorization', 'Bearer token_admin')
    .send({ plan: 'premium', planExpiresAt: '2026-10-31' });
  expect(res.status).toBe(422);
});

it('null no body limpa a data (sem vencimento)', async () => {
  const res = await request(app)
    .put(`/api/companies/${ID_EMPRESA}/plan`)
    .set('Authorization', 'Bearer token_admin')
    .send({ plan: 'premium', planExpiresAt: null });
  expect(res.status).toBe(200);
  expect(res.body.planExpiresAt).toBeUndefined();
});

it('campos ausentes no body mantêm as datas gravadas (undefined = mantém)', async () => {
  const res = await request(app)
    .put(`/api/companies/${ID_EMPRESA}/plan`)
    .set('Authorization', 'Bearer token_admin')
    .send({ plan: 'basic' });
  expect(res.status).toBe(200);
  expect(res.body.planStartedAt).toBe('2026-11-01'); // do seed do teste
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/routes/companies.plan.test.ts
```

Expected: FAIL (service ignora as datas).

- [ ] **Step 3: Implementar** — controller (`updatePlan`):

```ts
export const updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  throwIfInvalidId(String(req.params.id));
  const payload = req.body as UpdatePlanDto;
  const company = await companyService.updateCompanyPlan(String(req.params.id), payload, req.auth?.clerkId);
  if (!company) {
    res.status(404).json({ error: 'empresa não encontrada' });
    return;
  }
  res.json(company);
});
```

(importar `type UpdatePlanDto` de `../types/dto.js`).

Service (`updateCompanyPlan`) — trocar a escrita por:

```ts
  // Validação contra o ESTADO SALVO (precedente event.service): o body sozinho
  // não basta — enviar só planExpiresAt poderia deixar fim < início gravado.
  const atual = await CompanyModel.findById(id).lean();
  if (!atual) {
    throw Object.assign(new Error('empresa não encontrada'), { statusCode: 404 });
  }
  const inicioResultante = payload.planStartedAt === undefined ? (atual.planStartedAt ?? undefined) : (payload.planStartedAt ?? undefined);
  const fimResultante = payload.planExpiresAt === undefined ? (atual.planExpiresAt ?? undefined) : (payload.planExpiresAt ?? undefined);
  if (inicioResultante && fimResultante && fimResultante < inicioResultante) {
    throw Object.assign(new Error('data de vencimento não pode ser anterior à data de início'), { statusCode: 422 });
  }

  const update: Record<string, unknown> = { plan: payload.plan };
  // undefined = mantém (não toca); null = limpa ($unset) — semântica da spec §4.
  if (payload.planStartedAt === null || payload.planExpiresAt === null) {
    const unset: Record<string, 1> = {};
    if (payload.planStartedAt === null) unset.planStartedAt = 1;
    if (payload.planExpiresAt === null) unset.planExpiresAt = 1;
    update.$unset = unset;
  }
  if (payload.planStartedAt !== undefined && payload.planStartedAt !== null) update.planStartedAt = payload.planStartedAt;
  if (payload.planExpiresAt !== undefined && payload.planExpiresAt !== null) update.planExpiresAt = payload.planExpiresAt;

  const updated = await CompanyModel.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
    .populate('category')
    .populate('city')
    .lean();
```

(A checagem admin/401/403 anterior ao bloco permanece como está; remover a leitura antiga de `{ plan }` do body.)

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS (todos os `it` do arquivo, incluindo os antigos de 403/200).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/company.service.ts backend/src/controllers/company.controller.ts backend/src/routes/companies.plan.test.ts
git commit -m "feat(backend): PUT de plano persiste vigencia (valida contra estado salvo)"
```

---

### Task 5: Guard anti-escalada — PUT público descarta as datas

**Files:**
- Test: `backend/src/routes/companies.plan.test.ts` (acrescentar `it`)

**Interfaces:**
- Consumes: comportamento de descarte do `updateCompanySchema` (Task 3, nada a codificar — teste de regressão).

- [ ] **Step 1: Teste falhando** — em `companies.plan.test.ts` (dono autenticado via `token_dono`):

```ts
it('PUT publico do dono descarta plan/planStartedAt/planExpiresAt (anti-escalada)', async () => {
  const res = await request(app)
    .put(`/api/companies/${ID_EMPRESA}`)
    .set('Authorization', 'Bearer token_dono')
    .send({ description: 'Texto novo do dono', plan: 'premium', planStartedAt: '2026-11-01', planExpiresAt: '2026-12-31' });
  expect(res.status).toBe(200);
  expect(res.body.description).toBe('Texto novo do dono');
  // Nada do trio privilegiado mudou:
  expect(res.body.plan).toBe('free'); // plano original do fixture
  expect(res.body.planStartedAt).toBeUndefined();
  expect(res.body.planExpiresAt).toBeUndefined();
});
```

*(Ajuste o valor esperado de `plan` ao fixture real do arquivo.)*

- [ ] **Step 2: Rodar e ver passar** — o descarte pelo zod já cobre; se o teste falhar, há vazamento real (investigar `updateCompanySchema`).

```bash
cd backend && npx vitest run src/routes/companies.plan.test.ts
```

Expected: PASS (regressão — o zod descarta chaves desconhecidas).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/companies.plan.test.ts
git commit -m "test(backend): regressao anti-escalada - PUT publico descarta plano e datas"
```

---

### Task 6: Backend — coleção `PlanNotification` (dedup de avisos)

**Files:**
- Create: `backend/src/models/plan-notification.model.ts`
- Test: `backend/src/models/plan-notification.model.test.ts` (puro, sem banco)

**Interfaces:**
- Produces: `PlanNotificationModel` — documentos `{ companyId: ObjectId; kind: 'expiring-7d' | 'expiring-1d' | 'expired'; planExpiresAt: string; sentAt: Date }`, índice único `{ companyId: 1, kind: 1, planExpiresAt: 1 }` (mecanismo do claim-first).

- [ ] **Step 1: Teste falhando** — `backend/src/models/plan-notification.model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { PlanNotificationModel } from './plan-notification.model.js';

describe('plan-notification.model', () => {
  it('tem índice único por (companyId, kind, planExpiresAt)', () => {
    const indice = PlanNotificationModel.schema.indexes().find(
      ([chaves]) => 'companyId' in chaves && 'kind' in chaves && 'planExpiresAt' in chaves,
    );
    expect(indice).toBeTruthy();
    expect(indice?.[1].unique).toBe(true);
  });

  it('kind só aceita os três tipos de aviso', () => {
    const kind = PlanNotificationModel.schema.path('kind');
    expect(kind?.enumValues).toEqual(['expiring-7d', 'expiring-1d', 'expired']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/models/plan-notification.model.test.ts
```

Expected: FAIL (modelo não existe).

- [ ] **Step 3: Implementar** — `backend/src/models/plan-notification.model.ts`:

```ts
import { model, Schema } from 'mongoose';

/**
 * Registro de aviso de ciclo de plano já enviado (dedup do claim-first).
 * O índice único garante: no máximo UM aviso por (empresa, tipo, período) —
 * o envio grava primeiro e chave duplicada (11000) = já notificado.
 * Guarda apenas IDs e datas — sem PII (spec §10).
 */
const planNotificationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    kind: { type: String, enum: ['expiring-7d', 'expiring-1d', 'expired'], required: true },
    planExpiresAt: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

planNotificationSchema.index({ companyId: 1, kind: 1, planExpiresAt: 1 }, { unique: true });

export const PlanNotificationModel = model('PlanNotification', planNotificationSchema);
```

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/plan-notification.model.ts backend/src/models/plan-notification.model.test.ts
git commit -m "feat(backend): colecao PlanNotification para dedup de avisos (indice unico)"
```

---

### Task 7: Backend — `email.service.ts` (smtp/http + sanitização)

**Files:**
- Create: `backend/src/services/email.service.ts`
- Modify: `backend/.env.example`
- Deps: `cd backend && npm i nodemailer sanitize-html && npm i -D @types/nodemailer @types/sanitize-html`
- Test: `backend/src/services/email.service.test.ts` (novo)

**Interfaces:**
- Produces: `sendEmail(msg: EmailMessage): Promise<void>` com `EmailMessage = { to: string; subject: string; html: string; cc?: string[]; bcc?: string[] }`; `sanitizeEmailHtml(html: string): string`. Sem SMTP configurado → warn e return (não lança).

- [ ] **Step 1: Instalar deps** (dentro de `backend/`):

```bash
cd backend
npm i nodemailer sanitize-html
npm i -D @types/nodemailer @types/sanitize-html
```

- [ ] **Step 2: Teste falhando** — `backend/src/services/email.service.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock é içado: o dupla precisa vir de vi.hoisted (padrão do repo, veja companies.plan.test.ts).
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail }),
}));

import { sanitizeEmailHtml, sendEmail } from './email.service.js';

describe('sanitizeEmailHtml', () => {
  it('remove <script>, atributos on* e URIs javascript:', () => {
    const sujo = '<p onclick="hack()">Oi <script>alert(1)</script><a href="javascript:evil()">x</a></p>';
    const limpo = sanitizeEmailHtml(sujo);
    expect(limpo).not.toContain('script');
    expect(limpo).not.toContain('onclick');
    expect(limpo).not.toContain('javascript:');
  });
});

describe('sendEmail — transporte smtp', () => {
  beforeEach(() => {
    sendMail.mockReset();
    vi.stubEnv('EMAIL_TRANSPORT', 'smtp');
    vi.stubEnv('SMTP_HOST', 'smtp.teste');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'user');
    vi.stubEnv('SMTP_PASS', 'pass');
    vi.stubEnv('SMTP_FROM', 'Guia <no-reply@teste.com>');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('envia via nodemailer com cc/bcc e HTML sanitizado', async () => {
    await sendEmail({
      to: 'loja@teste.com',
      subject: 'Assunto',
      html: '<p>Olá <script>x()</script></p>',
      cc: ['copia@teste.com'],
    });
    expect(sendMail).toHaveBeenCalledOnce();
    const arg = sendMail.mock.calls[0]?.[0] as { html: string; cc?: string[] };
    expect(arg.html).not.toContain('script');
    expect(arg.cc).toEqual(['copia@teste.com']);
  });

  it('sem SMTP_HOST configurado: warn e NÃO lança (ciclo não trava)', async () => {
    vi.stubEnv('SMTP_HOST', '');
    await expect(sendEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>' })).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('sendEmail — transporte http (serviço próprio, futuro)', () => {
  beforeEach(() => {
    sendMail.mockReset();
    vi.stubEnv('EMAIL_TRANSPORT', 'http');
    vi.stubEnv('EMAIL_API_URL', 'https://email-api.teste/send');
    vi.stubEnv('EMAIL_API_SECRET', 'segredo');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('POST {to, subject, body, cc, bcc} com Bearer secret', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>', bcc: ['b@b.c'] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://email-api.teste/send');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer segredo');
    expect(JSON.parse(String(init.body))).toMatchObject({ to: 'a@b.c', subject: 's', body: '<p>x</p>', bcc: ['b@b.c'] });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/services/email.service.test.ts
```

Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar** — `backend/src/services/email.service.ts`:

```ts
import sanitizeHtml from 'sanitize-html';
import nodemailer from 'nodemailer';

/** E-mail do domínio: sempre HTML já montado pelo chamador, sanitizado aqui. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Sanitização OBRIGATÓRIA antes de qualquer envio (spec §6.1): o HTML interpola
 * dados de usuários (nome da empresa/cidade) — remove <script>, on*, URIs
 * javascript: etc., nos DOIS transportes (a emissária http também filtra do
 * lado dela; a defesa aqui é independente).
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt'],
    },
  });
}

function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function enviarPorSmtp(msg: EmailMessage): Promise<void> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: msg.to,
    subject: msg.subject,
    html: sanitizeEmailHtml(msg.html),
    cc: msg.cc,
    bcc: msg.bcc,
  });
}

/** Serviço próprio de e-mail (emissária: repassa e remove JS) — fase futura. */
async function enviarPorHttp(msg: EmailMessage): Promise<void> {
  const url = process.env.EMAIL_API_URL;
  const secret = process.env.EMAIL_API_SECRET;
  if (!url) {
    console.warn('[email] EMAIL_TRANSPORT=http sem EMAIL_API_URL — e-mail não enviado');
    return;
  }
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      to: msg.to,
      subject: msg.subject,
      body: sanitizeEmailHtml(msg.html),
      ...(msg.cc ? { cc: msg.cc } : {}),
      ...(msg.bcc ? { bcc: msg.bcc } : {}),
    }),
  });
  if (!resposta.ok) {
    throw Object.assign(new Error(`falha ao enviar e-mail (HTTP ${resposta.status})`), { statusCode: 502 });
  }
}

/** Envia o e-mail pelo transporte configurado. Falta de canal: warn, não lança. */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const transporte = process.env.EMAIL_TRANSPORT ?? 'smtp';
  if (transporte === 'http') {
    await enviarPorHttp(msg);
    return;
  }
  if (!smtpConfigurado()) {
    console.warn('[email] SMTP não configurado (EMAIL_TRANSPORT=smtp) — e-mail não enviado');
    return;
  }
  await enviarPorSmtp(msg);
}
```

- [ ] **Step 5: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 6: `.env.example`** — acrescentar em `backend/.env.example`:

```bash
# Notificações por e-mail (ciclo de vida de planos)
EMAIL_TRANSPORT=smtp            # smtp (provisório) | http (serviço próprio, futuro)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Guia Comercial <no-reply@seudominio.com>
EMAIL_API_URL=                  # POST { to, subject, body(html), cc, bcc } — futuro
EMAIL_API_SECRET=
# Job diário do ciclo de planos (parada de emergência)
PLAN_LIFECYCLE_DISABLED=false
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/email.service.ts backend/src/services/email.service.test.ts backend/.env.example backend/package.json backend/package-lock.json
git commit -m "feat(backend): email.service (smtp provisorio + http futuro) com sanitizacao obrigatoria"
```

---

### Task 8: Backend — `push.service.ts` (extração + funções direcionadas)

**Files:**
- Create: `backend/src/services/push.service.ts`
- Modify: `backend/src/controllers/push-token.controller.ts` (`broadcastPush` usa o serviço; o fetch inline sai)
- Modify: `backend/.env.example` (nada novo — `NOTIFY_*` já existe; se faltar `EXPO_PUSH_URL` não adicione: URL fixa do Expo)
- Test: `backend/src/services/push.service.test.ts` (novo)

**Interfaces:**
- Produces:
  - `sendPushToTokens(tokens: string[], title: string, body: string): Promise<void>` — POST `https://exp.host/--/api/v2/push/send`, lote por chamada; falha de rede → warn, não lança.
  - `sendPushToUser(clerkId: string, title: string, body: string): Promise<void>` — tokens com `clerkId` exato.
  - `sendPushToCity(cityId: string, title: string, body: string): Promise<void>` — join `PushToken.clerkId → UserModel.city === cityId` (agregação no Mongo); tokens sem dono não recebem.
- Consumes: `listAllPushTokens()` de `push-token.service.ts` (para o broadcast), `UserModel`.

- [ ] **Step 1: Teste falhando** — `backend/src/services/push.service.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock é içado: os espiões vêm de vi.hoisted (padrão do repo).
const { find, aggregate } = vi.hoisted(() => ({ find: vi.fn(), aggregate: vi.fn() }));

vi.mock('../models/push-token.model.js', () => ({
  PushTokenModel: { find, aggregate },
}));
vi.mock('../models/user.model.js', () => ({
  UserModel: { aggregate },
}));

import { sendPushToCity, sendPushToTokens, sendPushToUser } from './push.service.js';

function fetchOk() {
  return vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200 }));
}

/** Encadeia o encadeamento lean().exec() que o serviço usa após find(). */
function cursorCom(docs: unknown[]) {
  return { select: () => ({ lean: () => ({ exec: () => Promise.resolve(docs) }) }) };
}

describe('sendPushToTokens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POST para a API do Expo com as mensagens formatadas', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToTokens(['ExponentPushToken[a]'], 'Título', 'Corpo');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(JSON.parse(String(init.body))).toEqual([{ to: 'ExponentPushToken[a]', title: 'Título', body: 'Corpo' }]);
  });

  it('lista vazia: nem chama a rede', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToTokens([], 'T', 'B');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede: warn e NÃO lança (fire-and-forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    await expect(sendPushToTokens(['x'], 'T', 'B')).resolves.toBeUndefined();
  });
});

describe('sendPushToUser / sendPushToCity', () => {
  beforeEach(() => {
    find.mockReset();
    aggregate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sendPushToUser filtra tokens pelo clerkId exato', async () => {
    find.mockReturnValue(cursorCom([{ token: 'tok1' }]));
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToUser('user_1', 'T', 'B');
    expect(find).toHaveBeenCalledWith({ clerkId: 'user_1' });
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual([{ to: 'tok1', title: 'T', body: 'B' }]);
  });

  it('sendPushToCity faz join clerkId → UserModel.city e NÃO pega token sem dono', async () => {
    aggregate.mockReturnValue({ exec: () => Promise.resolve([{ token: 'tokCidade' }]) });
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToCity('000000000000000000000320', 'T', 'B');
    const pipeline = aggregate.mock.calls[0]?.[0] as unknown[];
    expect(JSON.stringify(pipeline)).toContain('$lookup');
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual([{ to: 'tokCidade', title: 'T', body: 'B' }]);
  });

  it('sendPushToCity com id malformado: nem consulta nem envia', async () => {
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToCity('nao-e-id', 'T', 'B');
    expect(aggregate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendPushToUser sem token: nem chama a rede', async () => {
    find.mockReturnValue(cursorCom([]));
    const fetchMock = fetchOk();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushToUser('user_nada', 'T', 'B');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/services/push.service.test.ts
```

Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar** — `backend/src/services/push.service.ts`:

```ts
import { Types, isValidObjectId } from 'mongoose';
import { PushTokenModel } from '../models/push-token.model.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Envia para uma lista explícita de tokens. Falha de rede: warn, não lança. */
export async function sendPushToTokens(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const mensagens = tokens.map((to) => ({ to, title, body }));
  try {
    const resposta = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mensagens),
    });
    if (!resposta.ok) {
      console.warn(`[push] API do Expo respondeu ${resposta.status} para ${tokens.length} mensagem(ns)`);
    }
  } catch (erro) {
    console.warn('[push] falha de rede ao enviar notificações:', erro instanceof Error ? erro.message : erro);
  }
}

/** Tokens vinculados à conta (clerkId exato) — aviso individual. */
export async function sendPushToUser(clerkId: string, title: string, body: string): Promise<void> {
  const docs = await PushTokenModel.find({ clerkId })
    .select({ token: 1 })
    .lean<{ token?: string }[]>()
    .exec();
  await sendPushToTokens(docs.map((d) => d.token).filter((t): t is string => typeof t === 'string'), title, body);
}

/** Todos os usuários de uma cidade (join clerkId → UserModel.city).
 * Tokens sem dono (anônimos/guest) nunca recebem — join por clerkId. */
export async function sendPushToCity(cityId: string, title: string, body: string): Promise<void> {
  if (!isValidObjectId(cityId)) return;
  const docs = await PushTokenModel.aggregate<{ token: string }>([
    { $match: { clerkId: { $exists: true, $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: 'clerkId',
        foreignField: 'clerkId',
        as: 'usuario',
      },
    },
    { $unwind: '$usuario' },
    { $match: { 'usuario.city': new Types.ObjectId(cityId) } },
    { $project: { token: 1, _id: 0 } },
  ]).exec();
  await sendPushToTokens(docs.map((d) => d.token), title, body);
}
```

(`Types` e `isValidObjectId` vêm de `mongoose`; o `$lookup` joina a coleção `users` direto — sem importar `UserModel`.)

- [ ] **Step 4: Refatorar `broadcastPush`** em `backend/src/controllers/push-token.controller.ts` — remover o `fetch` inline (linhas ~50-61) e usar:

```ts
import { listAllPushTokens } from '../services/push-token.service.js';
import { sendPushToTokens } from '../services/push.service.js';

// ... dentro do controller, no lugar do bloco fetch:
  const tokens = await listAllPushTokens();
  await sendPushToTokens(tokens, title, body ?? '');
  res.json({ sent: tokens.length });
```

**NÃO** migrar `event.service.ts` nem `notifyPromotion` (radar da spec §9.3 — mantenha o comportamento deles intacto).

- [ ] **Step 5: Rodar testes do arquivo e do push-tokens existente**

```bash
cd backend && npx vitest run src/services/push.service.test.ts src/routes/push-tokens.test.ts
```

Expected: PASS (broadcast mantém comportamento; ajuste os mocks do teste existente de broadcast se ele espiava `fetch` global — o espião agora precisa interceptar via `push.service`, mantendo as asserções de comportamento).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/push.service.ts backend/src/services/push.service.test.ts backend/src/controllers/push-token.controller.ts backend/src/routes/push-tokens.test.ts
git commit -m "feat(backend): push.service (tokens/user/cidade) e broadcast reusa o servico"
```

---

### Task 9: Backend — `plan-lifecycle.service.ts` (computeAction + runPlanLifecycle)

**Files:**
- Create: `backend/src/services/plan-lifecycle.service.ts`
- Test (unitário, puro): `backend/src/services/plan-lifecycle.service.test.ts` (novo)
- Test (integração): `backend/src/routes/companies.plan-lifecycle.test.ts` (novo)

**Interfaces:**
- Consumes: `CompanyModel` (Task 2), `PlanNotificationModel` (Task 6), `sendEmail` (Task 7), `sendPushToUser` (Task 8), `UserModel`, `todayInBrasilia()` (Task de fuso — já em master).
- Produces:
  - `computeAction(plan: 'free' | 'basic' | 'premium', planExpiresAt: string | undefined, hoje: string): 'expiring-7d' | 'expiring-1d' | 'expired' | null`
  - `runPlanLifecycle(hoje: string): Promise<{ notificadas: number; rebaixadas: number }>`
  - `agendarCicloDePlanos(): void` (usada pela Task 10 em `index.ts`)

- [ ] **Step 1: Teste unitário falhando** — `backend/src/services/plan-lifecycle.service.test.ts` (sem banco):

```ts
import { describe, expect, it } from 'vitest';

import { computeAction } from './plan-lifecycle.service.js';

describe('computeAction — matriz de vigência (spec §5.1)', () => {
  const EXPIRES = '2026-12-01';

  it('free nunca tem ação', () => {
    expect(computeAction('free', EXPIRES, '2026-11-24')).toBeNull();
  });

  it('sem planExpiresAt nunca tem ação (sem vencimento)', () => {
    expect(computeAction('premium', undefined, '2026-12-01')).toBeNull();
  });

  it('D-8 (fora da janela) → null', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-23')).toBeNull();
  });

  it('D-7 → expiring-7d', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-24')).toBe('expiring-7d');
  });

  it('D-2 → null', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-29')).toBeNull();
  });

  it('D-1 → expiring-1d', () => {
    expect(computeAction('premium', EXPIRES, '2026-11-30')).toBe('expiring-1d');
  });

  it('D-0 (dia do vencimento) → expired (plano vale até a véspera)', () => {
    expect(computeAction('premium', EXPIRES, '2026-12-01')).toBe('expired');
  });

  it('dia atrasado (cron caiu) → expired', () => {
    expect(computeAction('basic', EXPIRES, '2026-12-05')).toBe('expired');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/services/plan-lifecycle.service.test.ts
```

Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o núcleo puro** — `backend/src/services/plan-lifecycle.service.ts` (primeira versão, só `computeAction`):

```ts
export type PlanAction = 'expiring-7d' | 'expiring-1d' | 'expired' | null;

/** Diferença em dias entre duas datas YYYY-MM-DD (a - b). */
export function diasDeDiferenca(a: string, b: string): number {
  const [anoA, mesA, diaA] = a.split('-').map(Number) as [number, number, number];
  const [anoB, mesB, diaB] = b.split('-').map(Number) as [number, number, number];
  const msA = Date.UTC(anoA, mesA - 1, diaA);
  const msB = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((msA - msB) / 86400000);
}

/** Ação do ciclo para uma empresa no dia de hoje (spec §5.1).
 * D-0 é o dia do rebaixamento: o plano vale ATÉ a véspera. */
export function computeAction(
  plan: 'free' | 'basic' | 'premium',
  planExpiresAt: string | undefined,
  hoje: string,
): PlanAction {
  if (plan === 'free' || !planExpiresAt) return null;
  const dias = diasDeDiferenca(planExpiresAt, hoje);
  if (dias <= 0) return 'expired';
  if (dias === 7) return 'expiring-7d';
  if (dias === 1) return 'expiring-1d';
  return null;
}
```

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 5: Teste de integração falhando** — `backend/src/routes/companies.plan-lifecycle.test.ts` (padrão de modelos em memória do repo; `PlanNotificationModel` mockado com fake que aplica o índice único via Set):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyModel } from '../models/company.model.js';
import { UserModel } from '../models/user.model.js';
import { runPlanLifecycle } from '../services/plan-lifecycle.service.js';
import type { MemoryDocument, MemoryModel } from '../test-support/memory-model.js';

vi.mock('../models/company.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { CompanyModel: criarModeloEmMemoria() };
});
vi.mock('../models/user.model.js', async () => {
  const { criarModeloEmMemoria } = await import('../test-support/memory-model.js');
  return { UserModel: criarModeloEmMemoria() };
});

// vi.mock é içado: contêineres e fake do índice único vêm de vi.hoisted.
const { chavesEnviadas, enviadosEmail, enviadosPush } = vi.hoisted(() => ({
  chavesEnviadas: new Set<string>(),
  enviadosEmail: [] as unknown[],
  enviadosPush: [] as unknown[],
}));

// Fake do PlanNotification que aplica o índice único {companyId, kind, planExpiresAt}.
vi.mock('../models/plan-notification.model.js', () => ({
  PlanNotificationModel: {
    create: async (doc: { companyId: unknown; kind: string; planExpiresAt: string }) => {
      const chave = `${String(doc.companyId)}|${doc.kind}|${doc.planExpiresAt}`;
      if (chavesEnviadas.has(chave)) {
        throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      }
      chavesEnviadas.add(chave);
      return doc;
    },
  },
}));

// Stubs dos serviços reais de notificação (capturam a chamada, não enviam).
vi.mock('../services/email.service.js', () => ({
  sendEmail: async (msg: unknown) => {
    enviadosEmail.push(msg);
  },
}));
vi.mock('../services/push.service.js', () => ({
  sendPushToUser: async (clerkId: string, title: string, body: string) => {
    enviadosPush.push({ clerkId, title, body });
  },
}));

const modeloEmpresas = CompanyModel as unknown as MemoryModel;
const modeloUsuarios = UserModel as unknown as MemoryModel;
const HOJE = '2026-11-30';
const D7 = '2026-12-07';
const D1 = '2026-12-01';
const VENCIDA = '2026-11-30'; // hoje === expiresAt → expired

function empresa(dados: Partial<MemoryDocument>): MemoryDocument {
  return {
    _id: '000000000000000000000220',
    name: 'Loja Teste',
    slug: 'loja-teste',
    description: 'd',
    category: '000000000000000000000120',
    ownerClerkId: 'user_dono',
    plan: 'premium',
    ...dados,
  };
}

beforeEach(() => {
  chavesEnviadas.clear();
  enviadosEmail.length = 0;
  enviadosPush.length = 0;
  modeloEmpresas.documents.length = 0;
  modeloUsuarios.documents.length = 0;
  modeloUsuarios.documents.push({ _id: '000000000000000000000420', clerkId: 'user_dono', email: 'dono@teste.com', pushToken: 'ExponentPushToken[dono]' });
});

describe('runPlanLifecycle', () => {
  it('empresa em D-7 → notifica (email + push) e grava claim', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D7 }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(1);
    expect(enviadosEmail).toHaveLength(1);
    expect(enviadosPush).toHaveLength(1);
    expect(JSON.stringify(enviadosEmail[0])).toContain('7 dias');
  });

  it('empresa em D-1 → avisa "vence amanhã"', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D1 }));
    await runPlanLifecycle(HOJE);
    expect(JSON.stringify(enviadosEmail[0])).toContain('amanhã');
  });

  it('empresa vencida → rebaixa para free, preserva datas e notifica "expirado"', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: VENCIDA, planStartedAt: '2026-10-30' }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.rebaixadas).toBe(1);
    const doc = modeloEmpresas.documents[0] as Record<string, unknown>;
    expect(doc.plan).toBe('free');
    expect(doc.planStartedAt).toBe('2026-10-30'); // datas permanecem
    expect(doc.planExpiresAt).toBe(VENCIDA);
    expect(JSON.stringify(enviadosEmail[0])).toContain('expirou');
  });

  it('SEGUNDA execução com a mesma data não duplica nada', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: D7 }));
    await runPlanLifecycle(HOJE);
    const emailPrimeira = enviadosEmail.length;
    await runPlanLifecycle(HOJE);
    expect(enviadosEmail.length).toBe(emailPrimeira); // claim 11000 → pulado
  });

  it('empresa sem planExpiresAt e empresa free ficam intocadas', async () => {
    modeloEmpresas.documents.push(empresa({ planExpiresAt: undefined }));
    modeloEmpresas.documents.push(empresa({ plan: 'free', planExpiresAt: VENCIDA }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(0);
    expect(res.rebaixadas).toBe(0);
  });

  it('empresa sem dono vinculado → ciclo roda, notificação não sai (claim grava)', async () => {
    modeloEmpresas.documents.push(empresa({ ownerClerkId: undefined, planExpiresAt: D7 }));
    const res = await runPlanLifecycle(HOJE);
    expect(res.notificadas).toBe(1); // claim gravado
    expect(enviadosEmail).toHaveLength(0); // sem destinatário
  });
});
```

*(Ajuste os fixtures ao formato de documento que o `criarModeloEmMemoria` espera — veja `companies.plan.test.ts`.)*

- [ ] **Step 6: Rodar e ver falhar**

```bash
cd backend && npx vitest run src/routes/companies.plan-lifecycle.test.ts
```

Expected: FAIL (`runPlanLifecycle` não existe).

- [ ] **Step 7: Implementar a orquestração** — acrescentar ao `plan-lifecycle.service.ts`:

```ts
import { CompanyModel } from '../models/company.model.js';
import { PlanNotificationModel } from '../models/plan-notification.model.js';
import { UserModel } from '../models/user.model.js';
import { sendEmail } from './email.service.js';
import { sendPushToUser } from './push.service.js';
import { planLabel } from './plan-label.js';

const CONTEUDO: Record<
  Exclude<PlanAction, null>,
  {
    subject: (empresa: string, plano: string, vence: string) => string;
    corpo: (empresa: string, plano: string, vence: string) => string;
    push: (empresa: string, plano: string, vence: string) => string;
  }
> = {
  'expiring-7d': {
    subject: (empresa, plano) => `Seu plano ${plano} vence em 7 dias — empresa ${empresa}`,
    corpo: (empresa, plano, vence) =>
      `<p>Olá!</p><p>O plano <strong>${plano}</strong> da empresa <strong>${empresa}</strong> vence em 7 dias (${vence}). Renove com a equipe do guia para manter os benefícios.</p>`,
    push: (empresa, plano) => `${empresa}: seu plano ${plano} vence em 7 dias — renove com a equipe do guia`,
  },
  'expiring-1d': {
    subject: (empresa, plano) => `Seu plano ${plano} vence amanhã — empresa ${empresa}`,
    corpo: (empresa, plano, vence) =>
      `<p>Olá!</p><p>O plano <strong>${plano}</strong> da empresa <strong>${empresa}</strong> vence amanhã (${vence}).</p>`,
    push: (empresa, plano) => `${empresa}: seu plano ${plano} vence amanhã`,
  },
  expired: {
    subject: (empresa) => `Seu plano expirou — empresa ${empresa}`,
    corpo: (empresa) =>
      `<p>Olá!</p><p>O plano da empresa <strong>${empresa}</strong> expirou e a página voltou ao formato gratuito. Renove com a equipe do guia.</p>`,
    push: (empresa) => `${empresa}: seu plano expirou — renove com a equipe do guia`,
  },
};

/** Claim-first (spec §5.3): grava o registro ANTES de enviar; 11000 = já enviado. */
async function reivindicar(companyId: string, kind: Exclude<PlanAction, null>, planExpiresAt: string): Promise<boolean> {
  try {
    await PlanNotificationModel.create({ companyId, kind, planExpiresAt });
    return true;
  } catch (erro) {
    if ((erro as { code?: number }).code === 11000) return false;
    throw erro;
  }
}

export interface ResultadoCiclo {
  notificadas: number;
  rebaixadas: number;
}

/** Orquestra o ciclo diário (spec §5.2). Falta de canal não trava o ciclo. */
export async function runPlanLifecycle(hoje: string): Promise<ResultadoCiclo> {
  const empresas = await CompanyModel.find({
    plan: { $in: ['basic', 'premium'] },
    planExpiresAt: { $exists: true, $ne: null },
  })
    .lean<{ _id: unknown; name?: string; plan: 'basic' | 'premium'; planExpiresAt: string; ownerClerkId?: string }[]>()
    .exec();

  let notificadas = 0;
  let rebaixadas = 0;

  for (const empresa of empresas) {
    const acao = computeAction(empresa.plan, empresa.planExpiresAt, hoje);
    if (!acao) continue;

    const ganhouClaim = await reivindicar(String(empresa._id), acao, empresa.planExpiresAt);
    if (!ganhouClaim) continue;
    notificadas += 1;

    // Destinatário: dono vinculado → email + push. Sem dono: claim fica, sem envio.
    const dono = empresa.ownerClerkId
      ? await UserModel.findOne({ clerkId: empresa.ownerClerkId }).lean<{ email?: string } | null>().exec()
      : null;
    if (dono?.email) {
      const rotulo = planLabel(empresa.plan);
      const vence = empresa.planExpiresAt.split('-').reverse().join('/');
      const nome = empresa.name ?? 'Sua empresa';
      const conteudo = CONTEUDO[acao];
      await sendEmail({
        to: dono.email,
        subject: conteudo.subject(nome, rotulo, vence),
        html: conteudo.corpo(nome, rotulo, vence),
      }).catch(() => undefined);
      await sendPushToUser(empresa.ownerClerkId, conteudo.push(nome, rotulo, vence), 'Guia Comercial').catch(() => undefined);
    }

    if (acao === 'expired') {
      // Rebaixa (idempotente: plano já free é no-op). Datas permanecem (spec §3.3).
      await CompanyModel.updateOne({ _id: empresa._id, plan: { $in: ['basic', 'premium'] } }, { $set: { plan: 'free' } }).exec();
      rebaixadas += 1;
    }
  }

  return { notificadas, rebaixadas };
}
```

**Sobre `planLabel`:** extraia a função de rótulo PT-BR (`'Premium' | 'Básico' | 'Gratuito'`) para `backend/src/services/plan-label.ts` (novo, ~8 linhas, com teste em `plan-label.test.ts`:

```ts
export function planLabel(plan: 'free' | 'basic' | 'premium'): string {
  switch (plan) {
    case 'premium': return 'Premium';
    case 'basic': return 'Básico';
    default: return 'Gratuito';
  }
}
```
) — o backend não deve importar código do mobile, e a tradução precisa existir no lado servidor. Caso prefira, inline o switch no CONTEUDO; escolha UMA e não duplique.

- [ ] **Step 8: Rodar e ver passar**

```bash
cd backend && npx vitest run src/routes/companies.plan-lifecycle.test.ts src/services/plan-lifecycle.service.test.ts
```

Expected: PASS. *(Se o `criarModeloEmMemoria` não suportar `find` com `{$exists}`/`{$in}`, filtre no JS — busque `find({})` e filtre `plan !== 'free' && typeof planExpiresAt === 'string'`; o índice parcial da Task 2 cobre a coleção real.)*

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/plan-lifecycle.service.ts backend/src/services/plan-lifecycle.service.test.ts backend/src/routes/companies.plan-lifecycle.test.ts backend/src/services/plan-label.ts backend/src/services/plan-label.test.ts
git commit -m "feat(backend): ciclo de vida de planos (computeAction + runPlanLifecycle com claim-first)"
```

---

### Task 10: Backend — agendamento (node-cron em `index.ts`)

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/services/plan-lifecycle.service.ts` (adiciona `agendarCicloDePlanos`)
- Deps: `cd backend && npm i node-cron && npm i -D @types/node-cron` (se `@types/node-cron` não existir para a versão — node-cron v4 tem tipos próprios; verifique com `npm view node-cron types`)
- Test: gate (o agendamento é glue; o comportamento já está coberto pela Task 9)

**Interfaces:**
- Consumes: `runPlanLifecycle`, `todayInBrasilia`.
- Produces: cron registrado 1×/dia às 07:00 `America/Sao_Paulo`, desligável por `PLAN_LIFECYCLE_DISABLED=true`, nunca agendado em `NODE_ENV === 'test'`.

- [ ] **Step 1: Instalar node-cron** (dentro de `backend/`):

```bash
cd backend && npm i node-cron
```

- [ ] **Step 2: Implementar `agendarCicloDePlanos`** no fim de `plan-lifecycle.service.ts`:

```ts
import cron from 'node-cron';
import { todayInBrasilia } from '../utils/event-date.js';

/** Agenda o ciclo diário 07:00 fuso de Brasília (identificador canônico
 * America/Sao_Paulo — o link America/Brasilia não está no ICU do Node). */
export function agendarCicloDePlanos(): void {
  cron.schedule('0 7 * * *', () => {
    void runPlanLifecycle(todayInBrasilia()).catch((erro) => {
      console.error('[planos] ciclo diário falhou:', erro);
    });
  }, { timezone: 'America/Sao_Paulo', name: 'ciclo-planos' });
}
```

- [ ] **Step 3: Registrar em `backend/src/index.ts`** (APÓS `connectDatabase()` — não em `app.ts`):

```ts
import { agendarCicloDePlanos } from './services/plan-lifecycle.service.js';

// dentro de main(), depois de connectDatabase():
if (process.env.PLAN_LIFECYCLE_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
  agendarCicloDePlanos();
}
```

- [ ] **Step 4: Gate backend** — o `app.ts` não importa o cron (testes não agendam nada):

```bash
cd backend && npm run typecheck && npm run lint && npm test
```

Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts backend/src/services/plan-lifecycle.service.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): cron diario do ciclo de planos (07:00 America/Sao_Paulo)"
```

---

### Task 11: Admin — datas de vigência no formulário e listagem

**Files:**
- Modify: `admin/src/services/api.ts` (`updateCompanyPlan`, linha ~464)
- Modify: `admin/src/components/sections/empresas.tsx` (form ~L95-170, listagem ~L420)
- Test: manual (sem testes de componente no repo) + gate

**Interfaces:**
- Consumes: `UpdatePlanDto` do backend (Task 3) — payload `{ plan, planStartedAt?: string | null, planExpiresAt?: string | null }`.
- Produces: `updateCompanyPlan(id: string, payload: UpdateCompanyPlanPayload): Promise<Company>`.

- [ ] **Step 1: API client** — substituir em `admin/src/services/api.ts`:

```ts
export interface UpdateCompanyPlanPayload {
  plan: 'free' | 'basic' | 'premium';
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
}

export async function updateCompanyPlan(id: string, payload: UpdateCompanyPlanPayload): Promise<Company> {
  return request<Company>(`/companies/${encodeURIComponent(id)}/plan`, { method: 'PUT', body: payload });
}
```

(adapte ao helper `request` real do arquivo — mantenha o tratamento de `ApiError` existente).

- [ ] **Step 2: Formulário** — em `empresas.tsx`:
  1. Estado do form: acrescentar `planStartedAt: string` e `planExpiresAt: string` (default `''`); no `edit`, popular de `company.planStartedAt ?? ''` / `company.planExpiresAt ?? ''`.
  2. Inputs junto do select de plano (desabilitados quando `form.plan === 'free'`):

```tsx
<div className="grid grid-cols-2 gap-3">
  <label>
    <span>Início da vigência</span>
    <input type="date" value={form.planStartedAt} disabled={form.plan === 'free'}
      onChange={(e) => setForm((p) => ({ ...p, planStartedAt: e.target.value }))} />
  </label>
  <label>
    <span>Vence em</span>
    <input type="date" value={form.planExpiresAt} disabled={form.plan === 'free'}
      onChange={(e) => setForm((p) => ({ ...p, planExpiresAt: e.target.value }))} />
  </label>
</div>
```

(ajuste às classes de input do formulário existente — Tailwind da seção).

  3. Validação cliente: se `plan !== 'free'` e ambos preenchidos e `fim < início` → `setActionError('A data de vencimento não pode ser anterior à data de início')` e abortar o submit.
  4. **`handleSubmit` SEMPRE envia ambos os campos** (vazio → `null`; nunca omite — omitir faria o cron rebaixar no dia seguinte com data antiga, spec §7):

```ts
await updateCompanyPlan(editingId, {
  plan: form.plan,
  planStartedAt: form.planStartedAt || null,
  planExpiresAt: form.planExpiresAt || null,
});
```

(mesma mudança no fluxo de criação com plano ≠ free; no plano `free`, envie as duas datas como `null` para limpar).

- [ ] **Step 3: Listagem** — no texto do chip/linha da empresa (~L420), acrescentar a vigência quando houver data:

```ts
function vigenciaLabel(plan: 'free' | 'basic' | 'premium' | undefined, planExpiresAt?: string | null): string {
  if (!planExpiresAt) return planChipLabel(plan ?? 'free');
  const data = planExpiresAt.split('-').reverse().join('/');
  const vencido = plan === 'free' && planExpiresAt <= hojeEmBrasilia();
  return `${planChipLabel(plan ?? 'free')} · ${vencido ? `expirou em ${data}` : `até ${data}`}`;
}
```

(reaproveite/mova `hojeEmBrasilia` de `eventos.tsx` para `admin/src/utils/data-brasilia.ts` **só se** o DRY pagar — duas ocorrências: avalie; se criar o util, atualize `eventos.tsx` para importar dele).

- [ ] **Step 4: Verificação manual** — rodar admin (`npm run dev`) e backend local:
  1. Editar empresa premium, definir início/fim, salvar → recarregar, datas persistem.
  2. Definir fim < início → erro bloqueado no cliente; via API direta → 422.
  3. Empresa com plano free → inputs de data desabilitados.

- [ ] **Step 5: Gate admin**

```bash
cd admin && npm run typecheck && npm run lint && npm run build
```

Expected: tudo verde.

- [ ] **Step 6: Commit**

```bash
git add admin/src/services/api.ts admin/src/components/sections/empresas.tsx
git commit -m "feat(admin): datas de vigencia do plano no formulario e listagem de empresas"
```

---

### Task 12: Verificação final

- [ ] **Step 1: Gate completo nos três apps**

```bash
cd backend && npm run typecheck && npm run lint && npm test
cd ../mobile && npm run typecheck && npm run lint && npm test
cd ../admin && npm run typecheck && npm run lint && npm run build
```

Expected: tudo verde.

- [ ] **Step 2: `expo export`** (bundle do mobile não quebra com os novos campos do domínio):

```bash
cd mobile && npx expo export --platform web
```

- [ ] **Step 3: Smoke test manual** (exige admin + API + Mongo local):
  1. Admin define premium com `planExpiresAt` = hoje → rodar `runPlanLifecycle(hoje)` via script pontual (`node -e` com tsx ou teste) → empresa rebaixada + e-mail/push disparados (SMTP de teste).
  2. Empresa com `planExpiresAt` em D-7 → aviso chega, plano continua pago.
  3. Empresa sem data e empresa free → nada muda.
  4. Segunda execução → nenhuma notificação duplicada.
- [ ] **Step 4: Commit de fechamento** (se houver ajustes) + sincronizar checkboxes deste plano.

---

## Notas

- Fora de escopo (spec §9): webhook de pagamento, coleção `Subscription` (histórico — roadmap §9.1), banner in-app de expiração, migração dos outros fetch inline de push (`event.service.ts`, `notifyPromotion`).
- `planExpiresAt` ausente = sem vencimento — cortesia/parceiro nunca é rebaixado nem notificado.
- O rótulo PT-BR do plano no backend (`planLabel`) não deve ser importado do mobile — duplicação consciente (bordas de app), documentada na Task 9.
