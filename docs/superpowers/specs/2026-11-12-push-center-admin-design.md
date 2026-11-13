# Push Center no Admin — Design

> Complementa: `docs/superpowers/specs/2026-11-12-ciclo-vida-assinatura-design.md`
> (Task 8 extraiu `push.service.ts` — este design constrói a UI de composição
> e o histórico em cima dele).

## 1. Intenção

O admin hoje só dispara push via endpoint genérico de broadcast
(`POST /notifications/broadcast`, título + corpo para TODOS os tokens). Não há
histórico, segmentação, deep link, agendamento nem controle de entrega. Este
design adiciona o **Push Center**: composição de push customizada com
segmentação (usuário, lista de usuários, cidade, plano do lojista, favoritos de
uma empresa, broadcast), envio imediato ou agendado, histórico com status de
entrega (receipts da Expo) e limpeza de tokens mortos.

**Por quê:** notificações são o principal canal de reengajamento do guia
(eventos, avisos, promoções de lojistas pagantes). Hoje o broadcast cega não
segmenta e não deixa rastro — impossível auditar o que foi enviado e para quem.

## 2. Goals / Non-goals

**Goals**
- Compor push (título, corpo, imagem opcional, deep link opcional) no admin.
- Segmentar: broadcast · usuário único · lista de usuários · cidade · donos por
  plano (basic/premium) · usuários que favoritaram uma empresa.
- Enviar agora ou agendar (datetime em `America/Sao_Paulo`).
- Histórico persistido: campanha + contagem de enviados + receipts processados.
- Limpar tokens inválidos (DeviceNotRegistered) usando receipts da Expo.

**Non-goals (fase 2+)**
- Push rica (big picture, botões de ação, categorias Android).
- Notificações disparadas por gatilho de analytics (ex.: empresa entrou no top 10).
- Recorrência de campanha.
- UI mobile para campanhas (o app só RECEBE; nada muda nele além do deep link).

**Anti-goals (o que tornaria isto um fracasso)**
- Qualquer caminho pelo qual um não-admin dispara push.
- Push para quem pediu para não receber (`preferences.notifications = false`).
- Enviar token/expo push ID em log ou resposta de erro (PII/token leak).

## 3. Arquitetura

```
admin (nova seção "Notificações")
  └─ services/api.ts ─── POST /notifications/campaigns
                      │   POST /notifications/campaigns/:id/send-now (agendada → imediata, opcional)
                      │   GET  /notifications/campaigns?page&pageSize
                      │   GET  /notifications/campaigns/:id
                      │   DELETE /notifications/campaigns/:id (só draft/falha)
backend
  ├─ models/push-campaign.model.ts (NOVO)
  ├─ services/push-campaign.service.ts (NOVO: resolver segmento → tokens)
  ├─ services/push.service.ts (existe: sendPushToTokens ganha retorno de receiptIds)
  ├─ services/push-receipt.service.ts (NOVO: consulta receipts, marca tokens mortos)
  ├─ controllers/push-campaign.controller.ts (NOVO)
  ├─ routes/index.ts (rotas admin-only)
  └─ index.ts (cron a cada 5 min: dispara campanhas agendadas vencidas)
mobile
  └─ nada obrigatório; deep link usa rotas Expo Router existentes
```

### 3.1 Modelo `PushCampaign`

```ts
{
  title: string;                  // 3..64 chars
  body: string;                   // 3..280 chars
  imageUrl?: string;              // https obrigatório
  deepLink?: string;              // rota do app (whitelist §6.4)
  segment: {
    kind: 'broadcast' | 'user' | 'users' | 'city' | 'plan' | 'favorites';
    userIds?: string[];           // user/users (User._id)
    cityId?: string;              // city
    plan?: 'basic' | 'premium';   // plan (donos das empresas)
    companyId?: string;           // favorites (User.favorites contém o id)
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor?: Date;            // agendamento (UTC internamente)
  sentAt?: Date;
  receiptIds: string[];           // tickets ok aguardando consulta (§3.2.6)
  stats: { targeted: number; sent: number; failed: number; deadTokens: number };
  error?: string;                 // sem stack, sem token
  createdByClerkId: string;
}
{ timestamps: true }
```

> Limite de texto mais restritivo que o broadcast legado (`title` 120 / `body`
> 500): campanha é notificação composta no painel — 64/280 cobre com folga e
> evita push truncada. O broadcast legado não muda.

### 3.2 Fluxo de envio

1. Admin cria campanha (`status: draft` ou `scheduled`).
2. Ao enviar (imediato ou cron), o service **reivindica** a campanha com
   `findOneAndUpdate({ _id, status: { $in: ['draft', 'scheduled'] } },
   { $set: { status: 'sending' } })` — **claim-first**: duas execuções
   concorrentes (cron + admin clicando) não duplicam o envio.
3. Resolver segmento → lista de tokens (§5), deduplicada por `Set`.
4. `sendPushToTokens` (assinatura estendida: `{ tokens, title, body, data? }`)
   em lotes de **100 mensagens** (limite da Expo). A Expo responde HTTP 200 com
   **um ticket por mensagem** (`status: 'ok'` → `receiptId`; `status: 'error'` →
   `details.error`). O resultado é processado **por ticket**: ticket ok soma
   `sent`, ticket de erro soma `failed` e, quando `details.error` é
   `DeviceNotRegistered`, o token vai para a lista de mortos. Erro HTTP de
   request inteiro (400/429) falha o lote e soma os tokens do lote em
   `failed` — os próximos lotes seguem.
5. Resultado: `sentAt`, `stats.sent/failed`; `status: sent` (parciais falhados
   ficam refletidos em `stats.failed`, não reenviam).
6. **Pós-envio assíncrono:** os `receiptIds` (um por ticket ok) são persistidos
   em `PushCampaign.receiptIds` ANTES de `status: sent` — se o processo morrer
   entre envio e marcação, o cron de receipts retoma. O cron (5 min) consulta
   `https://exp.host/--/api/v2/push/getReceipts` com os pendentes e marca
   `DeviceNotRegistered` → token morto, removido do `PushToken` e contabilizado
   em `stats.deadTokens`. Receipts ainda pendentes na Expo ficam para a próxima
   execução (a Expo os guarda ~24h; após isso, pendências são descartadas com
   warn — o limbo é aceitável e contabilizado como "desconhecido").

### 3.3 Agendamento

Cron `node-cron` a cada 5 minutos (`America/Sao_Paulo`), junto do registro
existente do ciclo de planos: busca `status: 'scheduled' && scheduledFor <= agora`
e dispara o mesmo fluxo. `PLAN_LIFECYCLE_DISABLED` NÃO desliga o Push Center —
vira `PUSH_CENTER_DISABLED` (parada de emergência independente). Sem cron rodando
(agendada no passado + backend reiniciado), o cron pega na próxima volta — sem
janela perdida.

## 4. Segurança (não-negociável)

- **Admin-only server-side.** Todas as rotas de campanha exigem `role === 'admin'`
  (mesma checagem de `assertAdmin` do broadcast, com fail-closed quando não há
  Clerk). O frontend esconde a seção, mas a proteção é a rota.
- **Sem bypass de dev.** O broadcast legado tem `NODE_ENV=development` pulando
  autenticação (`push-token.controller.ts:19-21`) — comportamento preservado
  NELE por compatibilidade, mas **as rotas de campanha NÃO herdam o bypass**:
  exigem sessão de admin sempre (dev usa sessão de dev do Clerk).
- **Sem "spoofing" de segmento.** O `segment.kind` e os IDs vêm do body validado
  por zod (enum fechado; IDs com `isValidObjectId` → 422/404). Um admin comum
  não consegue, por exemplo, injetar `kind: 'users'` com IDs arbitrários de
  outra instância — a resolução de IDs é feita por query no banco local.
- **Integrações externas (`NOTIFY_SECRET`) NÃO criam campanhas.** O secret vale
  só para o broadcast legado; campanhas são exclusivas do painel com sessão
  Clerk de admin (auditoria por `createdByClerkId` — um secret compartilhado
  não tem autor identificável).
- **Opt-out respeitado.** `User.preferences.notifications === false` exclui o
  usuário de QUALQUER segmento (user, users, city, plan, favorites). Broadcast
  atual ignora isso — o novo respeita; o broadcast legado é mantido por
  compatibilidade, mas a UI do admin passa a usar só campanhas.
- **Guest tokens (sem clerkId):** só recebem em `kind: 'broadcast'` (comportamento
  atual preservado). Nos segmentos direcionados, tokens sem dono NUNCA recebem.
- **Rate limit:** criação de campanha limitada por admin (10/hora), dedup
  **in-memory por `createdByClerkId`** (mesma técnica e mesma limitação
  documentada do rate limit de analytics — com `TODO(redis)` análogo).
- **Auditoria:** `createdByClerkId` em toda campanha; a listagem mostra quem enviou.
- **Sem segredo/token em log:** falhas logam status e contagem, nunca o token
  nem a resposta completa da Expo.
- **Sem Clerk (modo legado): campanhas indisponíveis** — as rotas devolvem 401
  (fail-closed). O painel admin já pressupõe Clerk; integração por secret não
  existe aqui por decisão §4.

## 5. Resolução de segmento → tokens

| Kind         | Query                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| broadcast    | `PushTokenModel.find({})` (todos, incluindo guest)                        |
| user/users   | `User.find({ _id: { $in } }).select('clerkId')` → `PushToken.find({ clerkId: { $in } })` |
| city         | agregação `$lookup` existente de `sendPushToCity` (join `users.city`)     |
| plan         | `Company.find({ plan }).select('ownerClerkId')` → tokens por clerkId      |
| favorites    | `User.find({ favorites: companyId })` → tokens por clerkId                |

Depois da resolução, **sempre** filtrar usuários com opt-out ativo (exceto
broadcast, que vai para tokens; guest não tem User para optar).

> **Fonte do `User.favorites`:** o app mobile persiste o toggle via
> `updateMe({ favorites })` quando logado (`favorites-provider.tsx`) — o
> segmento funciona para usuários logados. Toggles de convidado ficam só no
> device (não entram no segmento; coerente com "guest não recebe direcionado").

## 6. Revisão de brechas (bugs/edge cases cobertos por testes)

1. **Concorrência cron + clique "enviar agora"** → claim-first garante 1 envio.
2. **Cron cai no dia do agendamento** → na volta, `scheduledFor <= agora` pega a
   campanha atrasada (nunca expira sozinha; admin cancela manualmente).
3. **Expo rejeita lote** (`erro de validação em 1 mensagem`) → a falha é por
   lote: campanha marca `stats.failed += lote` e segue os próximos lotes (uma
   mensagem ruim não mata a campanha).
4. **Tokens duplicados no segmento** (usuário com 2 devices, ou 2 usuários que
   resolvem para o mesmo token via clerkId compartilhado) → dedup por `Set`
   antes do envio (a Expo cobra e o usuário recebe 2×).
5. **Usuário sem token** (não deu permissão de push) → entra em `targeted`,
   não em `sent`; sem erro.
6. **Opt-out após a campanha ser criada** → o filtro roda NO MOMENTO do envio
   (resolução tardia), não na criação — quem desligou notificações depois de a
   campanha ser agendada não recebe.
7. **`imageUrl` com `http://` ou data URI** → 422 (só `https://`).
8. **`deepLink` fora da whitelist** → 422 (§6.4).
9. **Título/corpo com HTML/emoji/control chars** → zod `trim()` + limite; a Expo
   aceita texto puro — sem sanitização HTML (não é e-mail), mas control chars
   `\u0000-\u001f` são rejeitados.
10. **Campanha `sending` travada** (backend morreu no meio) → no boot do cron,
    campanhas em `sending` há mais de 30 min sem `sentAt` viram `failed` com
    `error: 'envio interrompido'` (auto-recuperação; não reenvia — admin decide
    recriar). O progresso parcial perdido não é recuperável (aceitado: `stats`
    podem subestimar; a campanha nunca duplica).
11. **DELETE de campanha** → permitido apenas para `draft`/`scheduled` (cancela
    antes do envio) e `failed`; `sent` → 409 (histórico é imutável); `sending`
    → 409 (em disputa; espere o claim resolver).
12. **Admin envia para si mesmo via `users`** → permitido (é admin), mas o
    opt-out dele ainda vale.
13. **`scheduledFor` no passado na criação** → 422 (agende para o futuro).
14. **Segmento `favorites` de empresa sem donos favoritando** → campanha com
    `targeted: 0` vai a `sent` com 0 envios (não é erro; admin vê o vazio).
15. **Plan segment com empresa sem dono** (`ownerClerkId` nulo) → sem token
    resolvido; não quebra.

### 6.4 Whitelist de deep link

Rotas Expo Router que **existem de verdade** no app (`mobile/src/app/`),
prefix-match (o valor enviado é o `href`):

```
/                     (home)
/(tabs)/search
/(tabs)/favorites
/(tabs)/profile
/company/[id]         (a rota real é por id, NÃO por slug)
/event/[id]
/tourist-spot/[id]
/job/[id]
/autonomous/[id]
/map
```

Validação: o valor deve começar com um dos prefixos acima; o resto
(`[id]`) é `[\w-]+`. Fora disso → 422. Rotas de cupom/aviso/utilidade
pública não existem no app — deep link para elas fica de fora até as telas
existirem (não é escopo deste design criar telas).

## 7. Admin UI (seção "Notificações")

- **Compositor** (formulário dedicado, padrão do redesign): título, corpo,
  imagem URL, deep link (select de rotas da whitelist + valor livre), segmento
  (radio: Broadcast / Usuário / Lista / Cidade / Plano / Favoritos) com o
  seletor dependente (busca de usuários reusando `getUsers`, select de cidades,
  select de empresas premium para favoritos), radio "Enviar agora / Agendar"
  com datetime-local.
- **Histórico** (tabela + mobileRows): título, segmento legível
  ("Broadcast" / "Usuário: Nome" / "Cidade: Castelo" / "Plano: Premium" /
  "Favoritos de: Empresa"), status (chip), agendado/em, enviados/alvo, quem
  enviou. Ações: ver detalhe (stats + error), cancelar (scheduled → draft),
  excluir (draft/scheduled/failed).
- **Detalhe**: `stats.targeted/sent/failed/deadTokens` + error message.

## 8. Mobile

O deep link chega como campo `data.url` no push Expo (o body do envio inclui
`{ to, title, body, data: { url: deepLink } }`). **Escopo real do mobile** (o
app hoje não intercepta nada — `expo-notifications` só registra token em
`auth-provider.tsx`):

1. `Notifications.setNotificationHandler` — exibir push com app em foreground.
2. Response listener (`addNotificationResponseReceivedListener` +
   `useLastNotificationResponse`) → `router.push(data.url)` quando `url` passa
   na MESMA whitelist (validada no cliente também — o push pode vir de fora).
3. **Cold start** (tap com app fechado) → `getLastNotificationResponseAsync`
   no boot e navegar.
4. Whitelist cliente em `mobile/src/utils/deep-link.ts` (mesma lista, `hasValidDeepLink(url): boolean`) com teste puro.

Sem isso o deep link da campanha é inútil no device — os 4 itens são parte
deste design.

## 9. Decisões (minhas chamadas, confirme se discordar)

| # | Decisão | Alternativa descartada |
| - | ------- | ---------------------- |
| 1 | Coleção nova `PushCampaign` (histórico imutável) | Reusar `PlanNotification` — semânticas diferentes |
| 2 | Cron a cada 5 min para agendadas | agendamento por `setTimeout` — morre no restart |
| 3 | Receipts em cron separado (5 min), `receiptIds` persistidos na campanha | consultar no envio — receipts chegam segundos depois |
| 4 | Processamento por ticket da Expo (HTTP 200 + tickets), lote falha por request inteiro | falhar a campanha inteira em 1 mensagem ruim |
| 5 | Broadcast legado continua (compat), com dev-bypass intacto NELE | quebrar `NOTIFY_SECRET` de integrações externas |
| 6 | Opt-out filtra segmentos direcionados E o broadcast do Push Center | manter broadcast cego — viola a preferência do usuário |
| 7 | Deep link whitelist server-side COM rotas reais do app (`/company/[id]`, sem cupom/aviso/utilidade) | aceitar qualquer string; criar telas novas |
| 8 | Campanhas sem bypass de dev e sem acesso por `NOTIFY_SECRET` (só sessão Clerk de admin) | copiar o dev-bypass do broadcast — campanha disparável sem auditoria |
| 9 | Rate limit de campanha in-memory por `createdByClerkId` (limitação documentada, `TODO(redis)`) | persistir agora — mesmo estágio do rate limit de analytics |
| 10 | Deep link assinatura de `sendPushToTokens` estendida com objeto `data` opcional (3 callers existentes atualizados) | função nova duplicada |

## 10. Fora de escopo

- Push rica (imagem grande, ações), recorrência, A/B, push por gatilho.
- Substituir `event.service.ts`/`notifyPromotion` por campanhas (radar da spec
  de ciclo de vida §9.3 — migração separada).
- Métricas de abertura (Expo não fornece; exigiria SDK no app).
