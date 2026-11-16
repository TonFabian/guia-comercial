# Ciclo de vida de assinatura (planStartedAt / planExpiresAt) — Design

> Data: 2026-11-12 · Status: em revisão
> Base: `docs/superpowers/specs/2026-11-10-monetizacao-design.md` (MVP de monetização, implementado)

## 1. Objetivo

Fechar a lacuna do MVP de monetização: hoje `plan` é uma flag manual sem vigência.
Este design adiciona o ciclo de vida da assinatura — datas de início/fim, job diário
que rebaixa planos vencidos e notificação proativa ao lojista (e-mail + push) antes
e na expiração. Ativação/renovação continua **manual pelo admin** (sem integração
com meios de pagamento; webhook fica no radar — §9).

## 2. Decisões registradas (com o produto)

| Decisão | Escolha |
| --- | --- |
| Modelagem | Campos `planStartedAt`/`planExpiresAt` em `Company` + coleção de log `PlanNotification` (abordagem A; B e C descartadas **para este escopo** — a coleção `Subscription` (B) está no roadmap, §9.1) |
| Executor do job | Cron no backend (node-cron), 1×/dia, com idempotência via índice único |
| Canais de aviso | E-mail **e** push |
| E-mail | Abstração única com dois transportes: `smtp` (provisório, nodemailer) e `http` (POST para serviço próprio de e-mail, futuro) |
| Push | Reutiliza infra existente (Expo push); extração de `push.service.ts` + funções direcionadas novas |
| Janela de avisos | D-7 ("renove"), D-1 ("vence amanhã") e no dia do vencimento (rebaixa + aviso "expirado") |
| Renovação | Manual: lojista fala com o admin, que estende as datas no painel |

## 3. Domínio e dados

### 3.1 `shared/domain.ts` (+ cópias idênticas em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts`, mesmo commit)

Em `Company`, após `plan?`:

```ts
/** Início do período do plano atual (YYYY-MM-DD, data pura, sem fuso). */
planStartedAt?: string;
/** Dia do vencimento (YYYY-MM-DD). O plano vale ATÉ a véspera; neste dia o
 * cron rebaixa para 'free'. Ausente/undefined = plano sem vencimento. */
planExpiresAt?: string;
```

Datas como **string `YYYY-MM-DD`** (data pura, sem fuso) — mesmo padrão de
`startDate`/`endDate` em `event.model.ts`, evita bugs de timezone. Comparações
usam `todayInBrasilia()` (em `backend/src/utils/event-date.ts`). **Fuso único do
guia: horário de Brasília (BRT, UTC-3)**, referenciado pelo identificador
canônico IANA **`America/Sao_Paulo`** — o link `America/Brasilia` não está no
ICU do Node e o `Intl` o rejeita ("Invalid time zone"). O helper hoje se chama
`todayInFortaleza` e é renomeado neste escopo, sem mudança de comportamento.

### 3.2 `backend/src/models/company.model.ts`

```ts
planStartedAt: String,
planExpiresAt: String,
```

Índice parcial para a query diária do cron:

```ts
// Índice parcial (não pode combinar sparse + partialFilterExpression no Mongo):
// cobre só documentos com plano pago — exatamente a query diária do cron.
companySchema.index(
  { planExpiresAt: 1 },
  { partialFilterExpression: { plan: { $in: ['basic', 'premium'] }, planExpiresAt: { $type: 'string' } } },
);
```

### 3.3 Semântica de vigência (explícita, evitar ambiguidade)

- Plano **vigente enquanto `hoje < planExpiresAt`** — o dia `planExpiresAt` é o
  dia do **rebaixamento** (plano vale até a véspera da data gravada).
- No dia do vencimento (ou depois, se o cron atrasar/falhar): `plan` → `'free'`
  e notificação "expirado". Reprocessar dias atrasados é seguro (idempotência §5.3).
- `planExpiresAt` **ausente** = plano sem vencimento (cortesia/parceiro) — nunca
  é rebaixado nem notificado pelo cron.
- Após o downgrade, **as datas permanecem** no documento (histórico do último
  período; o admin vê "expirado em DD/MM/AAAA" no painel). Renovar = admin grava
  novas datas.

### 3.4 Nova coleção `PlanNotification` (dedup de avisos)

`backend/src/models/plan-notification.model.ts` (novo):

```ts
{
  companyId: ObjectId (ref Company, required),
  kind: 'expiring-7d' | 'expiring-1d' | 'expired',
  planExpiresAt: String,   // YYYY-MM-DD do período notificado
  sentAt: Date,
}
// índice único: { companyId: 1, kind: 1, planExpiresAt: 1 }
```

O índice único é o mecanismo de idempotência: o envio **grava primeiro** ("claim")
e chave duplicada (11000) significa "já notificado neste ciclo" — sem janela
check-then-act entre instâncias.

## 4. DTO e autorização

- `PUT /companies/:id/plan` (rota admin existente) passa a aceitar:
  `{ plan, planStartedAt?, planExpiresAt? }`.
- zod (`backend/src/types/dto.ts`):
  - `planStartedAt`/`planExpiresAt`: `YYYY-MM-DD` estrito ou `null` (limpa);
    qualquer outra string → 422.
  - Regra composta: quando ambos presentes no body, `planExpiresAt >= planStartedAt`
    → senão 422 ("data fim anterior ao início").
  - Semântica de update: `undefined` no body = mantém a data gravada; `null` = limpa.
- **Validação contra estado salvo** (precedente `event.service.ts`, que valida o
  PUT parcial contra o documento): o service valida a **combinação resultante**
  (body + valores já gravados) — enviar só `planExpiresAt` que deixe a data fim
  anterior ao `planStartedAt` gravado → 422. Sem isso, o zod do body deixaria
  passar fim < início no documento resultante.
- **Fluxo de criação**: `createCompanySchema` já aceita `plan` no POST — empresa
  criada diretamente com plano pago e sem datas fica "sem vencimento"
  (cortesia/parceiro), coerente com §3.3. Comportamento intencional, registrado aqui.
- **Guard anti-escalada de privilégio**: o `PUT /companies/:id` público (dono da
  empresa) **descarta** `plan`, `planStartedAt` e `planExpiresAt` do body — hoje
  já remove `plan` via whitelist; as duas datas entram na mesma guard. O próprio
  empresário **nunca** consegue alterar plano/vigência; só o admin, pela rota
  dedicada `PUT /companies/:id/plan`. Teste de regressão cobre a tentativa
  (dono manda `planExpiresAt` no body → campo ignorado, resposta 200).
- Autorização permanece: a rota admin usa `requireAuthIfConfigured` + checagem de
  `role === 'admin'` no service (fail-closed, como hoje).

## 5. Ciclo de vida no backend

### 5.1 Serviço puro (testável sem I/O)

`backend/src/services/plan-lifecycle.service.ts` (novo):

```ts
export type PlanAction = 'expiring-7d' | 'expiring-1d' | 'expired' | null;

export function computeAction(
  plan: 'free' | 'basic' | 'premium',
  planExpiresAt: string | undefined,
  hoje: string, // YYYY-MM-DD
): PlanAction;
```

Matriz (núcleo do comportamento):

| Estado | Ação |
| --- | --- |
| `plan = 'free'` | `null` |
| `planExpiresAt` ausente | `null` |
| `hoje = expiresAt − 7` | `expiring-7d` |
| `hoje = expiresAt − 1` | `expiring-1d` |
| `hoje ≥ expiresAt` (plano ainda `basic`/`premium`) | `expired` |
| qualquer outra diferença | `null` |

Dias atrasados (cron caiu) ainda produzem `expired` — não há aviso "perdido" de
D-7/D-1 que já passou.

### 5.2 Execução do ciclo

`runPlanLifecycle(hoje: string)` no mesmo service, orquestração I/O:

1. Busca empresas `plan ∈ {basic, premium}` e `planExpiresAt` presente.
2. Para cada uma: `computeAction(...)`.
   - `expiring-7d`/`expiring-1d`: envia notificação (§6) com claim no
     `PlanNotification` (§5.3).
   - `expired`: envia notificação "expirado" (com claim **antes** do downgrade —
     evita perder o aviso se o processo cair entre o `updateOne` e o claim) e
     depois `updateOne` → `plan: 'free'`. A escrita é idempotente por si
     (rebaixar plano já `free` é no-op).
3. Sem SMTP e sem push token configurados: o claim é gravado mesmo assim (o
   admin acompanha a data no painel); nada trava o ciclo.

### 5.3 Idempotência (claim-first)

```
tentar insertOne({ companyId, kind, planExpiresAt, sentAt: agora })
→ sucesso: prossegue com e-mail/push (falha de envio NÃO desfaz o claim; retry
  manual/reexecução não reenvia — assumido aceitável para o MVP)
→ erro 11000 (chave duplicada): pula a empresa (já notificada)
```

Corrida de duas instâncias: exatamente uma ganha o insert.

### 5.4 Agendamento

- Dependência nova: `node-cron` (instalar dentro de `backend/`).
- Registro em `backend/src/index.ts` (não em `app.ts`, que é o alvo dos testes
  sem conexão de banco): `node-cron.schedule('0 7 * * *', ...)` com
  `timezone: 'America/Sao_Paulo'` (identificador canônico IANA do horário de
  Brasília; o link `America/Brasilia` não está no ICU do Node) — roda 1×/dia
  às 07:00.
- **Não roda em teste** (`NODE_ENV === 'test'` não agenda; a orquestração é
  chamada direto pelos testes com data fixa).
- Env de parada de emergência: `PLAN_LIFECYCLE_DISABLED=true` desliga o agendamento.

## 6. Notificações

### 6.1 E-mail — `backend/src/services/email.service.ts` (novo)

Interface única, transporte escolhido por env `EMAIL_TRANSPORT` (`smtp` | `http`):

```ts
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;       // já montado pelo chamador
  cc?: string[];
  bcc?: string[];
}
export async function sendEmail(msg: EmailMessage): Promise<void>;
```

- **`smtp` (default/provisório)**: nodemailer com `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **`http` (futuro)**: `POST EMAIL_API_URL` com JSON
  `{ to, subject, body: html, cc, bcc }` + header `Authorization: Bearer EMAIL_API_SECRET`.
  O serviço receptor é emissária (repassa, faz parse e remove JS) — nenhum
  estado nosso nele.
- **Sanitização obrigatória, nos dois transportes, sempre antes de enviar**:
  dependência `sanitize-html` remove `<script>`, atributos `on*`, URIs
  `javascript:`, iframes etc. Motivo: o HTML interpola dados de usuários
  (nome da empresa/cidade) — cuidado com JS permanece mesmo com a emissária
  fazendo o próprio parse.
- Sem `EMAIL_TRANSPORT`/SMTP configurados: `sendEmail` registra warn e retorna
  (não lança) — o ciclo não trava por falta de canal.

### 6.2 Push — `backend/src/services/push.service.ts` (novo)

Extração do fetch inline hoje em `push-token.controller.ts`, mais funções direcionadas:

```ts
/** Envia para uma lista explícita de tokens (base do broadcast e do direcionado). */
export async function sendPushToTokens(tokens: string[], title: string, body: string): Promise<void>;

/** Uma pessoa: tokens vinculados ao clerkId (PushTokenModel.clerkId). */
export async function sendPushToUser(clerkId: string, title: string, body: string): Promise<void>;

/** Todos os usuários de uma cidade (join clerkId → UserModel.city). */
export async function sendPushToCity(cityId: string, title: string, body: string): Promise<void>;
```

- `broadcastPush` (controller) passa a usar `sendPushToTokens(listAllPushTokens(), ...)` —
  comportamento idêntico, menos duplicação.
- **`sendPushToCity` é pedido explícito do produto** (infraestrutura para
  campanhas futuras por cidade — ex.: "todos que moram em Castelo do Piauí"),
  apesar de ainda sem chamador neste escopo; testes garantem que o join não
  vaza para tokens sem dono (anônimos/guest).
- Há outros fetch inline para `exp.host` no código (`event.service.ts` —
  notificação de evento; `company.service.ts` — `notifyPromotion`). **Neste
  escopo só o broadcast migra** para `push.service.ts`; os outros dois call
  sites ficam no radar (§9) para consolidação posterior.
- Falha de rede no push: warn e segue (fire-and-forget, mesmo espírito do broadcast).

### 6.3 Destinatário e conteúdo

- Destinatário: `Company.ownerClerkId` → `UserModel` (fornece `email` e
  `pushToken`). **Sem dono vinculado → sem notificação** (admin age pelo painel).
- Mensagens (PT-BR, incluem nome da empresa e data):
  - `expiring-7d`: "Seu plano {Premium|Básico} vence em 7 dias — renove com a equipe do guia."
  - `expiring-1d`: "Seu plano vence amanhã ({DD/MM/AAAA})."
  - `expired`: "Seu plano expirou e a página voltou ao formato gratuito. Renove com a equipe do guia."
- **Transacional**: avisos de assinatura ignoram o opt-out `preferences.notifications`
  (comunicação contratual, como recibo). Registrado aqui para não virar dúvida em review.
- Um dono com várias empresas recebe uma notificação **por empresa** (cada uma tem
  vigência própria).

## 7. Admin (painel)

- `admin/src/services/api.ts`: `updateCompanyPlan(id, payload)` estendido para
  `{ plan, planStartedAt?: string | null, planExpiresAt?: string | null }`.
- `admin/src/components/sections/empresas.tsx`:
  - Formulário: junto do select de plano, campos **Data de início** e
    **Data de fim** (`input type=date`), habilitados quando plano ≠ Gratuito.
  - **O formulário sempre envia ambos os campos**: vazio → `null` (limpa a data,
    = sem vencimento). Nunca omite o campo — omitir (undefined = "mantém") com
    data antiga no banco faria o cron rebaixar no dia seguinte (data no passado
    + plano pago → `expired`).
  - Validação espelha o backend: fim ≥ início (bloqueia no cliente, 422 no servidor).
- Listagem: coluna/plano exibe vigência quando existir — "Premium · até 31/12/2026";
  após downgrade, "Gratuito · expirou em 30/11/2026".

## 8. Testes (TDD)

- **Unitário** (`plan-lifecycle.service.test.ts`, puro, sem banco): matriz completa
  de `computeAction` — D-8, D-7, D-2, D-1, D-0, atrasado, sem data, `free`.
- **Integração** (`routes/companies.plan-lifecycle.test.ts`, supertest + modelos
  em memória, padrão do repo): execução com data fixa cobrindo
  - empresas em D-7/D-1 → notificação enviada (stubs de e-mail/push) e claim gravado;
  - vencida → `plan` vira `free`, datas preservadas, notificação "expirado";
  - **2ª execução com a mesma data não duplica** nada;
  - empresa sem `planExpiresAt` e empresa `free` intocadas;
  - empresa sem dono → ciclo roda, notificação não sai;
  - DTO: formato inválido → 422; `expiresAt < startedAt` → 422; `null` limpa.
- **Sanitização**: HTML com `<script>`/`onclick` interpolado via nome de empresa
  sai limpo do `email.service` (stubs capturam a saída).
- **Push service**: `sendPushToUser`/`sendPushToCity` — filtros corretos, sem
  vazamento para tokens sem dono.
- Admin: verificação manual (sem testes de componente no repo) + gate.

## 9. Roadmap (fora do escopo deste design, registrado para não se perder)

### 9.1 Coleção `Subscription` dedicada — histórico de assinaturas (ideia aprovada, fase futura)

Ideia vinda do review do MVP: **uma coleção própria para os planos**, removendo as
informações de vigência do modelo de `Company`. Vantagens que motivam a evolução:

- **Histórico completo de assinaturas** por empresa (contratos, renovações,
  upgrades/downgrades — hoje renovar sobrescreve as datas e o passado se perde).
- **Auditoria**: quem (admin) ativou/renovou, quando e por quanto tempo — base
  para relatórios de receita/MRR, churn e projeção de vencimentos futuros.
- **Fonte da verdade única** para a vigência: `Company.plan`/datas passam a ser
  **projeção** da assinatura vigente (desnormalização calculada), eliminando o
  risco de divergência entre datas e plano.
- Encaixa natural no **webhook de pagamento** (§9.2): a integração cria a
  `Subscription` e o service projeta para a `Company`.
- Permite histórico de **planos diferentes** (empresa que foi Premium, caiu para
  Básico e voltou a Premium, com períodos distintos).

Forma prevista (rascunho, a detalhar na spec futura):

```ts
Subscription {
  companyId: ObjectId,          // ref Company
  plan: 'basic' | 'premium',    // plano contratado no período
  startedAt: string,            // YYYY-MM-DD
  expiresAt: string | null,     // null = indeterminado
  status: 'active' | 'expired' | 'superseded',
  source: 'manual-admin',       // futuro: 'payment-webhook'
  createdBy: string,            // clerkId do admin
}
```

Caminho de migração (baixo risco, não exige reescrita): ao implementar, a
`PlanNotification` já está em coleção separada; o cron passa a ler a assinatura
vigente e gravar as datas na `Company` como projeção — a API pública e o mobile
**não mudam** (continuam lendo `Company.plan`/datas). Os dados atuais
(`planStartedAt`/`planExpiresAt`) viram a primeira `Subscription` de cada empresa
em um script de migração.

### 9.2 Webhook de pagamento (ativação/renovação automática)

Quando existir integração com meio de pagamento, ativar junto com §9.1: o
webhook cria/renova a `Subscription` e o service projeta para a `Company`. A
ativação manual do admin permanece como fallback (venda presencial).

### 9.3 Consolidação dos envios de push

`event.service.ts` (notificação de evento) e `company.service.ts`
(`notifyPromotion`) ainda fazem fetch inline para `exp.host` — migrar para
`push.service.ts` (§6.2) numa passada futura, completando o DRY.

### 9.4 Outros

- Banner in-app de expiração em "Minha Empresa" (canal extra no mobile).
- Renovação self-service pelo lojista.

## 10. Segurança

- Só admin altera plano/datas (`requireAdmin`); dono segue sem bypass pelo
  `PUT /companies/:id`.
- Sem PII nova: `PlanNotification` guarda apenas IDs e datas — nenhum e-mail,
  token ou IP.
- E-mail/push saem por canais já autorizados (SMTP próprio / Expo com tokens
  registrados com anti-sequestro).
- Cron não aceita entrada externa (nada de `req` no fluxo); trigger externo
  desligado por env (`PLAN_LIFECYCLE_DISABLED`), não por endpoint.
