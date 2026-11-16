# Spec: Programação interna de eventos turísticos (TourEvent.schedule)

**Data:** 2026-11-05
**Status:** proposta — aguardando aprovação
**Complementa:** `docs/superpowers/specs/2026-11-05-modulo-turismo-design.md`

## Problema

`TourEvent` modela o evento como um bloco monolítico (startDate/endDate + startTime/endTime). Festivais como o **Canyon Fest Poti** têm programação interna (atrações por dia/horário/palco), que precisa ser visível no app e editável no admin.

## Objetivo

Adicionar `schedule?: TourEventScheduleItem[]` a `TourEvent`, com:
- visibilidade no app (tela de detalhe do evento, agrupado por dia);
- edição no admin (lista ordenável de itens);
- validações (data dentro do intervalo do evento, horários válidos, ingresso por item opcional);
- referência opcional a um `TouristSpot` cadastrado.

## Non-goals
- Sem notificação push por item da programação (só ao criar o evento).
- Sem ingresso/checkout real — apenas texto/link, como já é no evento.
- Sem paginação da programação (lista curta por evento).

## Modelagem (shared/domain.ts)

```ts
export interface TourEventScheduleItem {
  /** Data do item (YYYY-MM-DD), dentro de [startDate, endDate]. */
  date: string;
  /** Horário de início (HH:mm). */
  startTime?: string;
  /** Horário de fim (HH:mm), >= startTime quando ambos presentes. */
  endTime?: string;
  /** Título da atração/atividade. */
  title: string;
  /** Descrição curta. */
  description?: string;
  /** Palco/local (ex.: "Palco Principal", "Praça Central"). */
  stage?: string;
  /** Atrativo referenciado (por id ou slug). */
  relatedSpot?: string | TouristSpot;
  /** Ingresso específico do item; se ausente, vale o do evento. */
  ticket?: 'free' | 'paid';
  ticketPrice?: string;
  ticketUrl?: string;
}
```

`TourEvent.schedule?: TourEventScheduleItem[]`.

## Validações (zod, no DTO)

- `schedule` é array (opcional).
- Cada item:
  - `date` obrigatório, formato `YYYY-MM-DD`.
  - `date` deve ser data válida `YYYY-MM-DD` E estar dentro de `[startDate, endDate]` do evento (superRefine cruzado; se `startDate`/`endDate` do evento forem inválidos, pular o refine para não mascarar o erro do evento).
  - `startTime`/`endTime` regex `HH:mm` quando presentes.
  - Se `endTime` presente, `endTime >= startTime`.
  - `title` obrigatório, não vazio.
  - Se `ticket === 'paid'`, `ticketPrice` obrigatório.
  - `relatedSpot` aceita id (ObjectId) ou slug (string) — resolvido no service como em `relatedCompany`.
- Sem validação de duplicatas no MVP (YAGNI) — admin pode repetir item; não bloquear.

## Backend

- Model: `schedule` embutido como subdocumento (array), sem coleção própria.
- Índice existente `{ active, endDate }` segue suficiente.
- Service: `resolveSpot` para `relatedSpot` (por id ou slug), padrão `resolveCompany`.
- Guest scrub: `scrubEvent` deve redigir contatos (phone/whatsapp) do `relatedSpot` populado; e, recursivamente, redigir `relatedCompany` populado dentro do spot (evita vazamento de contato da empresa aninhada). Estender `readPopulatedCompany` → `readPopulatedSpot`.
- Push: inalterado (só ao criar evento).

## Mobile

- Tela de detalhe do evento (`mobile/src/app/event/[id].tsx`): seção "Programação" agrupada por dia, ordenada por `startTime`; mostra palco e ingresso quando presentes; link para o `TouristSpot` quando `relatedSpot` populado.
- Helper puro testável `event-meta.ts`: função para agrupar/ordenar programação por dia; itens sem `startTime` vão ao fim do dia, ordenados por `title`.

## Admin

- Formulário de evento: editor de lista de itens (adicionar/remover/reordenar), com campos date, startTime, endTime, title, description, stage, relatedSpot (select de atrações), ticket/ticketPrice/ticketUrl.
- Validação client espelhando o zod (datas dentro do intervalo).

## Seed

- Canyon Fest Poti: programação real (3 dias) com pelo menos 2 itens por dia e palcos distintos; referência a atrações cadastradas onde fizer sentido.

## Tipos

- Sincronizar `shared/domain.ts`, `mobile/src/types/domain.ts`, `admin/src/types/domain.ts` no mesmo commit.

## Riscos

- DTO complexo (superRefine cruzado entre evento e itens). Testar bem.
- Guest scrub de `relatedSpot` populado (novo campo) — cobrir com teste.
- Admin UX de editor de lista — pode ser feito com inputs simples (sem drag-and-drop) no MVP.
