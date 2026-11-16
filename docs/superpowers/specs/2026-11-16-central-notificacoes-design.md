# Central de Notificações In-App — Design

Data: 2026-11-16
Status: Aprovado para implementação (r3 — pós-review de plano)
Escopo: backend (novo modelo + endpoints) e mobile (sininho + tela); admin só recebe a cópia de `domain.ts`.

---

## 1. Contexto e objetivo

O Guia Comercial já dispara **push** (campanhas do Push Center, promoção publicada, evento criado), mas não existe nenhum **feed in-app** por usuário: quem não estava com o app aberto no momento do push perde a novidade. Este design adiciona a Central de Notificações: um sininho com badge de não lidas na Home e uma tela com o feed do morador.

**Valor para o usuário (morador):** economia (saber de promoção de empresa que ele favoritou) e agenda (saber de evento novo na cidade), mesmo sem receber o push.

**Decisões já aprovadas em brainstorm (resumo):**
- Público: **logados** com feed sincronizado por conta; **convidado** vê os avisos públicos, sem estado de leitura.
- Gatilhos do MVP: **novo cupom de empresa favoritada** e **novo evento publicado**. Avisos do mural e campanhas do Push Center ficam fora do MVP.
- Abordagem escolhida: **notificação persistida no backend com fan-out no disparo** (Approach A), descartando feed derivado no cliente e feed a partir de campanhas.

**Relação com o push existente:** canais que compartilham pontos de disparo, whitelist de deep links, leitura de `User` e tipos de domínio — mas não infraestrutura de entrega (push = Expo Push API, efêmero; in-app = Mongo, persistido com estado de leitura). Sem fachada `notify()` no MVP (dois usos = YAGNI; AGENTS.md §4).

## 2. Modelo de dados

Novo model `Notification` em `backend/src/models/notification.model.ts`:

| Campo     | Tipo                       | Observação                                              |
| --------- | -------------------------- | ------------------------------------------------------- |
| `clerkId` | String (required, trim)    | Destinatário; vem da sessão, nunca de query param       |
| `type`    | `'coupon' \| 'event'`      | Enum required                                           |
| `title`   | String (required, trim)    | Ex.: "Nova promoção na Padaria Estrela"                 |
| `body`    | String (required, trim)    | Ex.: "Torta do dia com 20% off até 18h"                 |
| `deepLink`| String (required, trim)    | Rota do app, validada na whitelist existente            |
| `imageUrl`| String (opcional, trim)    | Evento = `photos[0]`; cupom = omitido (não tem imagem)  |
| `refId`   | String (required)          | `_id` do cupom/evento que originou                      |
| `readAt`  | Date \| null (default null)| `null` = não lida                                       |

`timestamps: true` (`createdAt` ordena o feed).

**Índices:**
- `{ clerkId: 1, createdAt: -1 }` — listagem.
- Único composto `{ clerkId: 1, refId: 1 }` — idempotência do fan-out (retry não duplica).

**Tipo de domínio:** `AppNotification` em `shared/domain.ts` (prefixo `App` evita colisão com `Notification` de push — mesma lição do `TourEvent`). Replicar em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` no **mesmo commit**.

## 3. Gatilhos (fan-out)

A falha de notificação **nunca rejeita** o POST de origem (mesma regra do push atual).

1. **`coupon.service.create`** — disparo **novo** (hoje não existe push na criação de cupom; o push "promoção publicada" — `notifyPromotion` — dispara na atualização do campo `promotion` da **empresa** em `company.service.updateCompany`). Condição: `expiresAt` ausente ou no futuro (`new Date()`; `expiresAt` é datetime completo — cupom não tem rascunho, POST é o único caminho de criação). Busca `User` com a empresa em `favorites` (array de string de id) e cria uma `Notification` por fã. Deep link: `/company/<companyId>` (não existe tela de cupom; a promoção aparece no detalhe da empresa).
2. **`event.service.create`** - evento publicado e vigente: fan-out para usuarios logados cujo User.city seja igual ao city do evento (selecao por cidade). Se o evento nao tiver cidade definida, nao ha fan-out in-app (o push segue broadcast como hoje). Deep link: /event/<id>.

**Mecânica do fan-out (comum aos dois):** `insertMany(docs, { ordered: false })`. Em retry, duplicata contra o índice único `{ clerkId, refId }` lança `MongoBulkWriteError` (code 11000) **mesmo com `ordered: false`** — o wrapper captura esse erro e trata como sucesso; qualquer outro erro é descartado (nunca rejeita o POST).

**Decisões explícitas:**
- Só `create` notifica; edição não gera notificação.
- **Opt-out:** hoje só as campanhas do Push Center respeitam `preferences.notifications` (`conjuntoOptOut`); os pushes irmãos `notifyPromotion`/`notifyNewEvent` **não** checam o opt-out. O feed in-app também **não** checa — canais distintos (push = efêmero; in-app = persistido), sem toggle novo no MVP (YAGNI).
- **Cidade:** fan-out de **evento** filtra por User.city === event.city (selecao por cidade ja no MVP, usando o campo existente). Fan-out de **cupom** segue por favoritos (ja seletivo; nao filtrar por cidade - um usuario pode favoritar empresa de outra cidade). Troca de cidade do usuario nao notifica retroativamente.
- Título/corpo gerados no backend em PT-BR; deep links validados pela whitelist `DEEP_LINK_PADRAO`/`ehDeepLinkValido` já existente.
- Sem cron de limpeza; feed é paginado (páginas de até 50 itens), sem teto total no MVP.

## 4. Endpoints

Todas as rotas em `backend/src/routes/index.ts`, **dentro do bloco `authDeps`** (como `/me`): em modo legado (sem `CLERK_SECRET_KEY`) respondem **404**; com Clerk configurado, sem sessão → **401**.

| Método | Rota                        | Comportamento                                                                                                                                |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/notifications`            | Paginada (`page`/`pageSize`, padrão 20, teto **50** — limite da listagem), `createdAt desc`. Resposta tipada como `NotificationsPage` (abaixo). |
| `PUT`  | `/notifications/read`       | Body zod `{ ids?: string[] }`. Com `ids`: marca só esses (id inexistente/de outro usuário é ignorado, sem 404). Sem `ids`: marca todas as não lidas. Retorna `{ unreadCount }`. |
| `GET`  | `/notifications/unread-count` | `{ unreadCount: number }` — chamada barata para o badge.                                                                                    |

**Tipo de resposta da listagem:** `NotificationsPage = Paginated<AppNotification> & { unreadCount: number }` — tipo próprio declarado em `shared/domain.ts` (e cópias) para não dar drift em relação ao `Paginated<T>` de 4 campos.

**Camadas (padrão do repo):** `notification.service.ts` (regra) + `notification.controller.ts` (só HTTP) + DTOs zod em `types/dto.ts`. Marcação de leitura usa `$set: { readAt: now }` apenas em documentos com `readAt: null` (idempotente).

**Segurança:** sanitização de query via `utils/query.ts`; escopo sempre por `req.auth.clerkId` (o filtro nunca vem de parâmetro do cliente); único input do usuário são ids, validados como ObjectId.

**Erros:** id malformado → 400; `PUT` com ids inexistentes → 200 com `unreadCount` inalterado (operação idempotente).

## 5. UI mobile

**API (`src/services/api.ts`, única porta de entrada):** `getNotifications(page)`, `markNotificationsRead(ids?)`, `getUnreadCount()`. Fallback mock = lista vazia (sem dados falsos de notificação).

**Sininho na Home:**
- Ícone Ionicons `notifications-outline` no header da Home (`features/home/header.tsx` — mesma família de ícones do header), com badge numérico de não lidas.
- Hook `use-unread.ts` (`src/features/notifications/`) recarrega quando a Home ganha foco (`useFocusEffect`) e após sair da tela de notificações. Sem polling em background no MVP.

**Nova rota `/notifications`** (`mobile/src/app/notifications.tsx` — a rota é a tela, compõe features; §6.1):
- Itens com ícone Ionicons por tipo (cupom = `pricetag-outline`, evento = `calendar-outline`), título, corpo, tempo relativo (helper puro `tempo-relativo.ts`) e bolinha de não lida.
- Tap: marca como lida → `router.push` no deep link (whitelist `ehDeepLinkValido`).
- Ação "Marcar todas como lidas" no topo; pull-to-refresh; paginação "Carregar mais".
- Estado vazio ("Sem novidades por aqui") e erro com retry — padrão das outras telas.

**Modo convidado:**
- Sino visível; no topo da tela, card "Entre para ver novidades das suas favoritas" (navega ao login); abaixo, os **avisos públicos** (reuso de `/notices` — o modelo de avisos **não tem campo cidade**; filtro por cidade de avisos fica fora do escopo) em formato informativo (título, corpo, data) — sem leitura nem deep link (não existe tela de detalhe de aviso).

**Regras do repo:** tokens de tipografia/cor via `theme.ts` (§6.3), `FlatList`, `accessibilityLabel` no sino e itens, cleanup em efeitos, sem `console.log`.

## 6. Testes e verificação

**Backend (TDD — teste falhando antes):**
- `notification.service.test.ts` (modelos em memoria, padrao `push-campaign.service.test.ts`): fa recebe e nao-fa nao recebe; falha no fan-out nao rejeita o POST; **duplicata no fan-out (11000, simulacao de retry) e tratada como sucesso**; cupom com `expiresAt` passada **nao** notifica (e sem `expiresAt` sim); evento publicado/vigente notifica **so usuarios com `User.city` igual ao do evento** (usuarios de outra cidade ou sem cidade nao recebem), rascunho/vencido nao.
- Supertest (contra `app.ts`): 401 sem sessão (com Clerk configurado); listagem escopada ao `clerkId` da sessão + `unreadCount`; `PUT /read` com/sem `ids` idempotente; id malformado → 400; isolamento entre usuários.

**Mobile:** `tempo-relativo.ts` (agora/minutos/horas/dias/futuro) e helper de badge (singular/plural, teto "99+") como funções puras testadas.

**Gates (cópia de `domain.ts` toca os três apps → gate completo):** backend lint/typecheck/test/build · mobile typecheck/expo lint/test/expo export · admin lint/typecheck/test/build.

**Verificação manual (pós-implementação):** cupom criado para empresa favoritada por usuário de teste → badge, item e deep link no app.

## 7. Fora do escopo (MVP)

- Avisos do mural e campanhas do Push Center como gatilhos (futuro — o modelo já suporta novos `type`).
- Toggle de notificações in-app nas Configurações.
- Lembretes de evento ("Vou neste evento") — parte do sub-projeto Agenda da Cidade.
- Troca de cidade do usuario notificando retroativamente (semantica indefinida; MVP notifica so no create).
- Filtro de cidade nos avisos do convidado (`Notice` não tem campo `city`).
- Cron de limpeza de notificações antigas.
- Fachada `notify()` unificando push + in-app (apareceria com poucos usos — YAGNI por ora).
- Dívida existente fora do escopo: `notifyPromotion`/`notifyNewEvent` duplicam `fetch` cru em vez de usar `push.service.sendPushToTokens`.
