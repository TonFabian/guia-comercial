# Especificação — Módulo Turismo (P3 16)

**Data:** 2026-11-05  
**Status:** Aprovado (brainstorming + revisão minuciosa concluídos; v2 após code review)  
**Escopo:** MVP = atrações turísticas + eventos (multi-cidade, foco em turistas/visitantes). Hospedagem apenas como nota de design (§10).

---

## 1. Objetivo

Adicionar um módulo de Turismo ao Guia Comercial que permita ao turista/visitante
descobrir **pontos turísticos** (atrações permanentes) e **eventos** (programações
temporárias) por cidade, com tela de detalhe, integração à busca existente e
seção dedicada na Home (aparece apenas quando há conteúdo ativo).

## 2. Decisões (brainstorming + revisão)

| # | Decisão | Justificativa |
|---|---|---|
| D1 | **Entidades separadas** (`TouristSpot`, `TourEvent`) | Semânticas distintas: atração é permanente, evento é temporário. Segue o padrão do repo (entidade dedicada por conceito, como `AutonomousProfessional` vs `Company`). |
| D2 | **Multi-cidade desde o início** | Todas as entidades referenciam `City` (slug único), como `Company` e `AutonomousProfessional`. |
| D3 | **MVP = atrações + eventos** | Hospedagem fica apenas como nota de design (§10) — SEM tipo no código (YAGNI, AGENTS.md §3). |
| D4 | **Fonte de dados MVP = admin** | Cadastro manual via painel admin (`assertAdmin`). Futuro: donos cadastram hospedagem (`assertOwner`, como `Company`). |
| D5 | **Seção dedicada na Home** | Aparece apenas quando há pelo menos uma atração ou evento ativo. Cards horizontais (similar ao Mural). |
| D6 | **Integração com a busca: chips fixos + seções mescladas** | Chips fixos "Atrações" e "Eventos" na tela de busca (não vêm de `/categories`). Quando um chip está ativo, a tela busca `/tourist-spots` e `/events` em paralelo com `/companies` e renderiza **seções separadas** ("Empresas", "Atrações", "Eventos"), cada item navegando para o detalhe certo. A busca atual (`GET /companies?category=slug`) NÃO retorna turismo — por isso o fetch paralelo. |
| D7 | **Tela por entidade** | `tourist-spot/[id].tsx` e `event/[id].tsx` (route-as-screen, AGENTS.md §6.1/6.2). |
| D8 | **Categorias extensíveis** | Enum por entidade, com `other` para novas cidades. |
| D9 | **Visibilidade de evento: fim do dia de `endDate`** | Evento visível se `active === true` E `endDate >= hoje`, onde "hoje" é calculado no fuso **America/Fortaleza (UTC-3)**. Comparação por **data** (`YYYY-MM-DD`), não por datetime ISO — o evento do dia NÃO some no próprio dia de encerramento (só no dia seguinte). Eventos futuros aparecem como "em breve". |
| D10 | **Atração sempre ativa** | `active === true`, sem expiração. |
| D11 | **Push apenas ao criar evento** | Notificação dispara uma única vez no `POST /api/events` ("Novo evento…"). Atualizações/ativações não notificam (evita spam). Reuso do padrão `notifyPromotion` de `company.service.ts`. |
| D12 | **Coordenadas (lat/lng) com valores reais** | Para mapa e "Como chegar" (reuso de `openMapLink`). Seed de Castelo do Piauí usa coordenadas reais (não as de Fortaleza). |
| D13 | **Interface renomeada `TourEvent`** | Evita shadowing do tipo global DOM `Event` no admin (Vite) e em código web. O **model Mongoose** continua `Event` e a rota continua `/api/events`. |
| D14 | **Guest scrub explícito para Turismo** | `phone`/`whatsapp` são redigidos para convidados. `website`, `instagram`, `ticketUrl`, `entryPrice` são públicos por natureza de evento/atração (não redigidos). O scrub atual detecta "Company" por shape (`slug+category+name`) — `TouristSpot`/`TourEvent` casariam POR ACIDENTO; é obrigatório criar `isTouristSpot`/`isTourEvent` explícitos e redigir também `relatedCompany`/`organizerCompany` **populadas** (hoje `readPopulatedCompany` só inspeciona o campo literal `company` → vazaria contato da empresa aninhada). |

## 3. Entidades

### 3.1 `TouristSpot` (atração turística permanente)

```ts
export interface TouristSpot {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: TouristSpotCategory;
  photos?: string[];
  address?: string | null;
  city?: string | City;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  entryFee?: 'free' | 'paid' | 'donation';
  entryPrice?: string;            // texto livre ("R$ 10,00"); obrigatório se entryFee === 'paid'
  phone?: string | null;
  whatsapp?: string | null;
  website?: string;
  instagram?: string;
  featured?: boolean;
  active: boolean;
  order?: number;
  relatedCompany?: string | Company;  // empresa relacionada (ex.: parque municipal), por id ou slug
  createdAt?: string;
  updatedAt?: string;
}
```

> Sem `rating`/`ratingCount` — avaliações estão fora do escopo (§11). Campo sem
> produtor é dívida (YAGNI).

### 3.2 `TourEvent` (evento temporário — interface; model/rota seguem `Event`)

```ts
export interface TourEvent {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: TourEventCategory;
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD (>= startDate)
  startTime?: string;             // "19:00" (HH:mm)
  endTime?: string;               // "23:00" (HH:mm)
  location?: string;              // nome do local
  address?: string | null;
  city?: string | City;
  latitude?: number;
  longitude?: number;
  organizer?: string;             // nome do organizador
  organizerCompany?: string | Company;  // por id ou slug
  ticket?: 'free' | 'paid';
  ticketPrice?: string;
  ticketUrl?: string;
  photos?: string[];
  phone?: string | null;
  whatsapp?: string | null;
  website?: string;
  instagram?: string;
  active: boolean;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

### 3.3 Enums

```ts
export type TouristSpotCategory =
  | 'nature' | 'park' | 'waterfall' | 'viewpoint'
  | 'museum' | 'church' | 'monument' | 'square'
  | 'adventure' | 'other';

export type TourEventCategory =
  | 'festival' | 'show' | 'fair' | 'exhibition'
  | 'sport' | 'religious' | 'cultural' | 'workshop' | 'other';
```

> `Lodging` NÃO entra no código — ver §10 (nota de design).

## 4. Regras de visibilidade (backend)

- **Atração**: `active === true` → sempre visível. Sem expiração.
- **Evento**: `active === true` AND `endDate >= hoje` (compara **datas** `YYYY-MM-DD`;
  "hoje" derivado do relógio do servidor convertido para **America/Fortaleza**).
  Consequência: evento encerrado **hoje** ainda aparece **hoje**; some **amanhã**.
- **`?active=false`** retorna apenas rascunhos inativos (não vencidos).
- **`?includePast=true`** (uso do admin): lista TODOS os eventos `active=true`,
  incluindo vencidos — sem isso o painel não consegue gerenciar eventos passados.
- **`GET /api/events/:id` de evento vencido**: responde **200** com o objeto
  normal (a tela mobile exibe selo "**Encerrado**"). links compartilhados por
  WhatsApp continuam funcionando. 404 somente quando o id não existe ou é
  malformado.

## 5. Endpoints (padrão do repo)

```
GET    /api/tourist-spots?city=&category=&active=&page=&pageSize=  → Paginated
GET    /api/tourist-spots/:id
POST   /api/tourist-spots   (admin)
PUT    /api/tourist-spots/:id (admin)
DELETE /api/tourist-spots/:id (admin)

GET    /api/events?city=&category=&active=&includePast=&page=&pageSize=  → Paginated
GET    /api/events/:id           (200 mesmo para vencido)
POST   /api/events   (admin; dispara push — uma única vez)
PUT    /api/events/:id (admin; sem push)
DELETE /api/events/:id (admin)
```

Mutations já ficam protegidas pelo middleware global `requireAuthForMutations`
(`backend/src/routes/index.ts`); o service reforça com `assertAdmin`
(defesa em profundidade, padrão `notice.service.ts`).

### Índices (model)

- `slug` único (`unique: true`).
- Spots: `{ active: 1, city: 1, category: 1 }`.
- Events: `{ active: 1, endDate: 1 }`.

## 6. Validação zod (borda — `backend/src/types/dto.ts`)

- `createTouristSpotSchema`: `name`, `slug`, `description`, `category` (enum) e
  `active` **required**; demais campos `optional()`.
- `createTourEventSchema`: `name`, `slug`, `description`, `category`, `startDate`,
  `endDate`, `active` **required**; demais `optional()`.
- **Regras cruzadas** (`.superRefine`):
  - `endDate >= startDate`.
  - `entryPrice` obrigatório quando `entryFee === 'paid'`.
  - `ticketPrice` obrigatório quando `ticket === 'paid'`.
  - `startTime`/`endTime` no formato `HH:mm` (`regex`).
- **Relacionais**: `category` de Company receberá `objectIdSchema` **ou slug**
  (emular `resolveCategoryId`, aceitar ambos como em `createCompanySchema`).
- **`city`**: slug, `.nullish()` (permite limpar no PUT, padrão
  `createPublicUtilitySchema`).
- PUT valida `.partial()` (`.superRefine` ajustado para aceitar campos ausentes).

## 7. Telas (mobile)

- `tourist-spot/[id].tsx` — foto (`expo-image` + `placeholder`/`transition`),
  descrição, horários, entrada, contato gateado para convidado, botão "Como
  chegar" via `openMapLink` (reuso), tokens de `theme.ts`, a11y.
- `event/[id].tsx` — datas/horários ("em breve" se futuros; selo "**Encerrado**"
  se vencido), local, ingresso, organizador, "Como chegar", tokens, a11y.
- Seção "Turismo & Eventos" na Home: cards horizontais; carrega `pageSize=6`
  (`?active=true`); **vazio → a seção NÃO renderiza**; **erro → mensagem curta
  de seção** (padrão PublicUtilities); os cards usam `accessibilityLabel`.
- Busca: chips fixos "Atrações" e "Eventos" (D6) — fetch paralelo das 3 coleções
  e seções separadas com navegação para o detalhe correto.

## 8. Admin

- **Duas seções** em `admin/src/components/sections/`: `atracoes.tsx` e
  `eventos.tsx` (padrão das outras seções); estender o tipo `Section` do
  sidebar e registrar em `App.tsx` (que fica fino — AGENTS.md §7).
- Form "Atrações": nome, slug, descrição, categoria (select do enum), fotos,
  endereço, cidade (select), lat/lng, horários (linhas de texto), entryFee
  (select) + entryPrice (texto, exigido se paid), phone/whatsapp, website,
  instagram, featured, active, order, relatedCompany (select de empresas —
  o `Catalog` já carrega).
- Form "Eventos": nome, slug, descrição, categoria, **datas** (inputs de texto
  com validação `YYYY-MM-DD` e comparação endDate >= startDate — sem datepicker
  no padrão atual), início/fim (HH:mm), local, cidade, lat/lng, organizador,
  organizerCompany (select de empresas), ingresso (select) + preço (exigido se
  paid) + ticketUrl, fotos, contatos, featured, active.
- Usuário admin vê eventos vencidos com `?includePast=true`.

## 9. Integração com o guia comercial

- Atrações podem referenciar uma `Company` (`relatedCompany`).
- Eventos podem referenciar um `organizerCompany`.
- **Guest scrub** (D14) em toda resposta que atravessar o middleware de convidado
  (utils/guest.ts + testes).
- Notificação push ao criar evento (D11 — uma única vez).
- Coordenadas (lat/lng) para mapa e "Como chegar" (D12).

## 10. Nota de design futura (Lodging — NÃO implementar no MVP)

Quando implementado (pós-MVP):
- Criar entidade `Lodging` com `ownerClerkId` (cadastro por donos, como
  `Company` — Airbnb-like) + moderação admin (`assertAdmin`).
- Tela `lodging/[id].tsx` e seção "Hospedagem" na Home.
- Tipos: campos prováveis — `type`: hotel/pousada/hostel/casa/quarto/airbnb;
  `capacity`, `priceRange`, `amenities`. (Não colocar interface no
  `shared/domain.ts` hoje — YAGNI.)

## 11. Fora do escopo (MVP)

- Hospedagem (Lodging) — §10 apenas.
- Cadastro por donos (Airbnb-like) — §10 apenas.
- Avaliações de atrações/eventos (sem `rating`/`ratingCount` nas entidades).
- Mapa com pins de turismo — reuso futuro de `interactive-map.tsx`.

## 12. Testes obrigatórios (TDD — AGENTS.md §2)

Backend (supertest contra `app.ts`), como em `public-utilities.test.ts`:
- Listagem paginada (`Paginated<T>`), POST 201, 422 de payload inválido,
  404 de id malformado, 409 de slug duplicado, 401/403 de mutation sem auth/
  não-admin, filtros `?city=`/`?category=`/`?active=`.
- **Expiração por data**: evento com `endDate` = hoje aparece; com `endDate` =
  ontem não aparece; `?includePast=true` traz o vencido.
- **Guest scrub**: convidado recebe `phone`/`whatsapp` `null` em spot/evento;
  `relatedCompany`/`organizerCompany` **populadas** redigidas (contatos nulos);
  autenticado recebe tudo.

Mobile (vitest, helpers puros em `features/tourism/`):
- Formatação de datas/horários do evento ("em breve"/"Encerrado").
- Mesclagem das seções de busca (empresas + atrações + eventos) e navegação.
