# Marco da Aplicação — Planos Executados

> Registro (marco) das decisões e planos já implementados no Guia Comercial.
> Atualizado em 2026-11-16. Cada plano/spec de `docs/superpowers/` que já foi
> executado está resumido abaixo (objetivo, arquitetura, decisões, arquivos
> principais e verificação). Itens parciais e não implementados estão ao final.
> Planos não implementados (backlog, diagnósticos) também são listados.

---

## 1. Autenticação Clerk — mobile + backend (auth-clerk)

- **Docs:** `archive/executed/plans/2026-10-22-auth-clerk.md`, `archive/executed/specs/2026-10-22-auth-clerk-design.md`
- **Objetivo:** Login social (Google/Apple) + e-mail/senha via Clerk no mobile; home protegida; modo convidado com dados limitados; mirror de usuários do Clerk no Mongo com backend autenticado.
- **Arquitetura:** `ClerkProvider` + `AuthProvider` (Context) no mobile com guard de rota e fallback dev; `@clerk/expo` SSO com `expo-web-browser`. Backend valida o session token JWT via `@clerk/backend` em middleware próprio (fábrica injetável para teste); mirror via webhook svix (`verifyWebhook` + `express.raw`) e bootstrap on-demand via Clerk Backend API.
- **Decisões-chave:** Token expirado com header presente → 401 (nunca degradar a guest silenciosamente); webhook montado **antes** do `express.json` (assinatura svix falha se o body for reparseado); usuário do provider é o do Clerk (UI tolera erro de `/me`); writes públicos permanecem sem token; dev sem env Clerk = comportamento legado idêntico.
- **Arquivos:** `mobile/src/providers/auth-provider.tsx`, `mobile/src/features/auth/use-auth-guard.ts`, `mobile/src/app/(auth)/*`, `mobile/src/services/http.ts`; `backend/src/models/user.model.ts`, `backend/src/services/user.service.ts`, `backend/src/utils/clerk-user.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/middlewares/guest.middleware.ts`, `backend/src/routes/webhooks/clerk.ts`, `backend/src/controllers/user.controller.ts`.
- **Verificação:** `npm test` (backend, incluindo `app.test.ts` legado), lint e typecheck dos três apps; `npx expo export` no mobile.

## 2. Guest Login (backend)

- **Doc:** `archive/executed/specs/2026-11-01-guest-login-backend-design.md`
- **Objetivo:** Endpoint de login como convidado e redação de dados sensíveis nas respostas.
- **Implementado:** `POST /auth/guest`; middleware `guestScrub` que intercepta `res.json` e redige `phone/whatsapp/address/code` para convidados (`scrubCompany`, `scrubCoupon`, `scrubGuestResponse`); modo convidado persistido em `AsyncStorage`.
- **Arquivos:** `backend/src/utils/guest.ts`, `backend/src/middlewares/guest.middleware.ts`.

## 3. Anuncie no Guia

- **Doc:** `archive/executed/plans/2026-11-02-anuncie.md`
- **Objetivo:** Substituir o placeholder `comingSoon` do CTA "Anuncie no Guia" por uma tela real de contato.
- **Implementado:** Rota `mobile/src/app/announce.tsx` com informações de anúncio e botões de contato (WhatsApp, e-mail, telefone) via `Linking.openURL`; CTA navega para a rota; remoção do import de `comingSoon`.
- **Verificação:** typecheck + lint + export web.

## 4. Detalhe de Vaga

- **Doc:** `archive/executed/plans/2026-11-02-detalhe-vaga.md`
- **Objetivo:** Tela de detalhe de vaga (substituir alert "em breve").
- **Implementado:** `getJobById` em `api.ts` com fallback mock; rota `mobile/src/app/job/[id].tsx` (título, empresa, tipo, localização, descrição, "Ver empresa", "Voltar"); botão "Ver Vaga" em `job-list.tsx` navega para `/job/${job._id}`.

## 5. Correções e Qualidade

- **Doc:** `archive/executed/plans/2026-11-02-fixes-e-qualidade.md`
- **Objetivo:** Corrigir bugs e brechas sem adicionar funcionalidades.
- **Implementado:** Remoção de mock data da busca em produção (apenas quando `!isApiConfigured()`); persistência/restauração do modo convidado (reload); `Content-Type: application/json` em `http.ts` (inicial e retry); renovação de token com `getToken({ skipCache: true })` no retry 401; feedback imediato na busca (`setLoading(true)` antes do debounce); seed de backend com empresa de id válido; remoção de texto duplicado "Entre para ver o contato"; formulário de senha envolvido em `<form>` no web.
- **Verificação:** lint + typecheck mobile/backend; `npm test` backend.

## 6. Perfil do Usuário

- **Docs:** `archive/executed/plans/2026-11-02-perfil-usuario.md`, `archive/executed/specs/2026-11-02-perfil-usuario-design.md`
- **Objetivo:** Edição de perfil ("Meus dados") e sincronização de favoritos entre aparelhos (Abordagem B).
- **Implementado:** Backend `User` ganha `favorites`, `ownedCompanyIds`, `preferences`; `updateUser` service; `UpdateUserDto` zod; controller `updateMe`; rota `PUT /api/me` atrás de `requireAuth` + `validateBody`; mobile `getMe`/`updateMe`; `FavoritesProvider` mescla local+remoto (união sem duplicatas) quando `state === 'signedIn'`; tela de perfil com formulário (nome, sobrenome, telefone, foto URL) + Salvar.
- **Decisões-chave:** Favoritos não duplicam; convidado não chama `/me`; webhook Clerk não sobrescreve `favorites/ownedCompanyIds/preferences`; `PUT /me` valida via zod (400 inválido); e-mail read-only (fonte Clerk).
- **Arquivos:** `backend/src/models/user.model.ts`, `backend/src/services/user.service.ts`, `backend/src/types/dto.ts`, `backend/src/controllers/user.controller.ts`, `backend/src/routes/index.ts`; `mobile/src/providers/favorites-provider.tsx`, `mobile/src/app/(tabs)/profile.tsx`.

## 7. Novas Funcionalidades

- **Docs:** `archive/executed/plans/2026-11-03-novas-funcionalidades.md`, `archive/executed/specs/2026-11-03-novas-funcionalidades-refinada.md`
- **Objetivo:** Novidades (notices) e seção "Outras Empresas".
- **Implementado:** Modelo `Notice` + carousel no mobile; seção "Outras Empresas" na Home; CRUD no admin.

## 8. Configurações

- **Docs:** `archive/executed/plans/2026-11-05-configuracoes.md`, `archive/executed/specs/2026-11-05-configuracoes-design.md`
- **Objetivo:** Persistir preferências de notificação e completar a tela Configurações (suporte, termos, versão).
- **Implementado:** `User.preferences` com `notifications`, `publicUtilityAlerts`, `jobPostingAlerts`; DTO zod; tela mobile com dois switches (atualização otimista, sempre envia os dois valores), links via `utils/links.ts` e constantes em `support.ts`, seção "Suporte & Termos" (WhatsApp + termos), versão do app.

## 9. Hardening de Parâmetros de Query

- **Doc:** `archive/executed/plans/2026-11-05-hardening-parmetros-query.md`
- **Objetivo:** Sanitizar todas as entradas (query/body) do backend (fail-closed).
- **Implementado:** `backend/src/utils/query.ts` (`lerTexto`, `lerBooleano`, `lerInteiro`, `lerListaDeSlugs`, `lerEnum`); `parsePagination` com teto de `page` (10.000); sanitização nos services (`company`, `coupon`, `notice`, `public-utility`, `tourist-spot`, `event`, etc.); `owner` aplicado só se coincidir com `req.auth.clerkId` (senão 403); `ownerClerkId` removido do DTO público de autônomos; `isValidObjectId` em `findById`; push-tokens validado por zod (409 se token de outra conta); broadcast com limites; `/cities` com limite 500; suíte de regressão de segurança (supertest).
- **Decisões-chave:** Parâmetro malformado = 400 explícito; sanitização no service (choke point); `sanitizeFilter` do Mongoose **não** ativado (quebraria `$gte`/`$in` legítimos).

## 10. Limpeza de Duplicidades

- **Docs:** `archive/executed/plans/2026-11-05-limpeza-duplicidades.md`, `archive/executed/specs/2026-11-05-limpeza-duplicidades-design.md`
- **Objetivo:** Remover empresa em destaque da lista secundária da Home; remover login duplicado do menu do Perfil; retirar "Minha empresa" de Configurações.
- **Implementado:** Funções puras testáveis `excludeFeaturedCompany` (`home-companies.ts`) e `buildMenu` (`profile-menu.ts`); Home aplica filtro com `useMemo`; Perfil consome o menu puro (sem item "entrar" para guest); Configurações perde a seção "Minha empresa".

## 11. Módulo Turismo

- **Docs:** `archive/executed/plans/2026-11-05-modulo-turismo.md`, `archive/executed/specs/2026-11-05-modulo-turismo-design.md`
- **Objetivo:** Pontos turísticos e eventos (multi-cidade, foco em visitantes).
- **Implementado:** Entidades `TouristSpot` e `TourEvent` (model + service + controller + DTO + rotas) no backend; guest scrub explícito (isTouristSpot/isTourEvent, redação de `phone/whatsapp` e empresas populadas); expiração por data (America/Fortaleza, helper `isEventVisibleOn`); push apenas ao criar evento; consumo mobile (seção na Home + telas de detalhe + busca mesclada); seções no admin (CRUD); seed de 4 atrações e 2 eventos de Castelo do Piauí.
- **Decisões-chave:** Turismo não duplica empresas; guest scrub recursivo; expiração por DATA (não comparar data pura com datetime ISO); busca mesclada com fetch paralelo e chips fixos; interface `TourEvent` (sem shadowing de `Event` DOM); seção some quando vazia / mostra erro quando falha.
- **Arquivos:** `backend/src/models/tourist-spot.model.ts`, `backend/src/models/event.model.ts`, `backend/src/services/tourist-spot.service.ts`, `backend/src/services/event.service.ts`, `backend/src/utils/event-date.ts`, `backend/src/utils/guest.ts`; `mobile/src/features/home/tourism-section.tsx`, `mobile/src/app/tourist-spot/[id].tsx`, `mobile/src/app/event/[id].tsx`; `admin/src/components/sections/atracoes.tsx`, `eventos.tsx`.

## 12. Módulo Turismo — Schedule (programação interna de eventos)

- **Docs:** `archive/executed/plans/2026-11-05-modulo-turismo-schedule.md`, `archive/executed/specs/2026-11-05-modulo-turismo-schedule-design.md`
- **Objetivo:** Adicionar programação interna (`schedule`) a `TourEvent`.
- **Implementado:** Campo embutido `schedule?: TourEventScheduleItem[]`; validação zod cruzada (date dentro de `[startDate,endDate]`, `endTime >= startTime`, `ticketPrice` se paid); `resolveSpot` no service; guest scrub recursivo (`relatedSpot` → `relatedCompany`); helper puro `event-meta.ts` no mobile (agrupar/ordenar por dia, itens sem startTime ao fim, "Encerrado"); seção "Programação" na tela de detalhe; editor de schedule no admin; seed do Canyon Fest Poti com programação.

## 13. Módulo Turismo — Addendum de Filtros

- **Doc:** `plans/2026-11-05-modulo-turismo-addendum-filtros.md`
- **Objetivo:** Eliminar duas limitações: Home ignora filtro de cidade; busca filtra turismo só no cliente.
- **Implementado:** Backend `?q=` em `/tourist-spots` e `/events` (regex case-insensitive em name/description/location, `escapeRegex` extraído para `utils/regex.ts`); mobile `TourismSection` recebe `city` e recarrega; busca envia `q` ao servidor e pagina turismo (estado próprio por coleção: página, total, exhausted).

## 14. Sair & Tema

- **Docs:** `archive/executed/plans/2026-11-05-sair-tema.md`, `archive/executed/specs/2026-11-05-sair-tema-design.md`
- **Objetivo:** Confirmar saída em modal e voltar a Visitante; proteger default escuro do tema.
- **Implementado:** `AuthProvider.signOutToGuest` (ativa convidado antes de encerrar a sessão Clerk, persiste em AsyncStorage); `SignOutModal` temático; `ProfileScreen` abre modal e chama a ação; `resolveThemeMode` puro testado (default `dark`).
- **Arquivos:** `mobile/src/providers/auth-provider.tsx`, `mobile/src/providers/theme-mode.ts`, `mobile/src/features/profile/sign-out-modal.tsx`, `mobile/src/features/profile/profile-screen.tsx`.

## 15. Tipografia Padronizada (Rubik + Inter)

- **Docs:** `archive/executed/plans/2026-11-06-tipografia.md`, `archive/executed/specs/2026-11-06-tipografia-design.md`
- **Objetivo:** Padronizar tipografia mobile + admin (Rubik headings, Inter body, escada xs/sm/md/lg/xg, escala fluida, E2E visual).
- **Implementado:** `mobile/src/theme/fluid-width.ts` (clamp 0.9–1.2); tokens `FontFamily`/`FontWeight`/`Type` xs..xg/`Typography` presets em `theme.ts`; carregamento de fontes via `@expo-google-fonts`; migração mecânica de ~52 arquivos; admin com `@fontsource-variable`, CSS vars em rem, clamp nos headings, tokens TS; gate de grep de tokens crus no CI; regras permanentes no AGENTS.md (§6.3 e §7).
- **Verificação:** typecheck + lint + testes (207) + `expo export`; Playwright multi-viewport (parcialmente).

## 16. Migração Company openingHours → schedule

- **Docs:** `archive/executed/plans/2026-11-07-company-schedule-migration.md`, `archive/executed/specs/2026-11-07-company-schedule-migration-design.md`
- **Objetivo:** Migrar horário de funcionamento de Company de `openingHours: string[]` para `schedule: { day, opens, closes }[]` como fonte da verdade, sem quebrar clientes antigos.
- **Implementado:** Helpers `parseOpeningHoursString`/`convertOpeningHoursToSchedule`/`isCompanyOpen` em `utils/opening-hours.ts`; script de migração idempotente; backend aceita/deriva ambos (deprecação); mobile "aberto agora" usa schedule com fallback; editor estruturado no mobile e admin; `openingHours` marcado `@deprecated`.
- **Decisões-chave:** `opens/closes` em minutos 0–1439; `closes < opens` = fecha no dia seguinte; string não parseável mantém `openingHours` + log; remoção final de `openingHours` fora do escopo (rollout).

## 17. Owner de Empresa gerencia Jobs e Cupons

- **Docs:** `archive/executed/plans/2026-11-07-owner-empresa-jobs-cupons.md`, `archive/executed/specs/2026-11-07-owner-empresa-jobs-cupons-design.md`
- **Objetivo:** Permitir que o dono da empresa vinculada a um Job/Coupon faça CRUD, além de admins.
- **Implementado:** `assertOwnerOrAdmin` em `job.service.ts` e `coupon.service.ts` (substitui `assertAdmin`); resolução da empresa do recurso; `company` não pode ser alterado no update (DTO `Omit<Partial<Create>, 'company'>`); recurso inexistente → 404, sem sessão → 401, sem permissão → 403.

## 18. Multi-Cidade

- **Doc:** `archive/executed/specs/2026-11-07-multi-city-migration.md`
- **Objetivo:** Suportar múltiplas cidades (sair do acoplamento a Castelo do Piauí).
- **Implementado:** Modelo `City`; seletor de cidade no mobile e admin; persistência em AsyncStorage (`@guia:selectedCitySlug`); remoção de hardcode de default; fluxo GPS ("Perto de mim") com fallback gracioso; generalização de mocks/seeds.

## 19. Detalhes de Empresa Gratuita

- **Docs:** `archive/executed/plans/2026-11-08-detalhes-loja-gratuita.md`, `archive/executed/specs/2026-11-08-detalhes-loja-gratuita-design.md`
- **Objetivo:** Tela de detalhes enxuta para empresas sem destaque (`isFeatured !== true`), mantendo a tela completa para as em destaque.
- **Implementado:** Rota única `/company/[id]` decide entre layout completo e `CompanyFreeDetailScreen`; regra e view model em `company-free-view.ts` (TDD, 12 testes); tela enxuta com foto única, nome, status, categoria, endereço, descrição (≤4 linhas), card de horários (3 linhas), WhatsApp/Ligar, favoritar, voltar; token `ButtonTextColors` em theme.
- **Arquivos:** `mobile/src/features/company/company-free-view.ts`, `mobile/src/features/company/company-free-detail-screen.tsx`, `mobile/src/features/company/company-detail-screen.tsx`.

## 20. Schedule UX 24h

- **Docs:** `archive/executed/plans/2026-11-08-schedule-ux-24h.md`, `archive/executed/specs/2026-11-08-schedule-ux-24h-design.md`
- **Objetivo:** Substituir entrada em minutos por formato 24h (HH:MM) com conversão, em mobile e admin.
- **Implementado:** Helpers puros `toMinutes`/`toTime`/`isValidRange` (`schedule-time.ts`); grade de 7 dias com toggle + DateTimePicker (mobile) e `<input type="time">` (admin); botão "Aplicar a todos os dias abertos"/"Preencher semana"; mesma UX para TouristSpot.

## 21. TouristSpot Schedule Migration

- **Doc:** `archive/executed/specs/2026-11-08-touristspot-schedule-migration-design.md`
- **Implementado:** `TouristSpot` usa `schedule` (sem `openingHours`), alinhado à migração de Company.

## 22. Monetização (MVP Lojista)

- **Docs:** `archive/executed/plans/2026-11-10-monetizacao.md`, `archive/executed/specs/2026-11-10-monetizacao-design.md`
- **Objetivo:** Planos Gratuito/Básico/Premium com diferenciação real (tela enxuta vs. completa, catálogo, cupom destacado, analytics, prioridade na busca), sem checkout in-app.
- **Implementado:** Campo `plan` em `Company` (free/basic/premium, default free, indexado); backend expõe/valida e bloqueia bypass (`PUT /companies/:id` ignora `plan`; rota dedicada `PUT /companies/:id/plan` exige admin); mobile `companyPlan`/`hasFeature`; catálogo de produtos com "Pedir no WhatsApp"; analytics fire-and-forget (`trackView`, `trackWhatsappClick`); endpoints `POST /companies/:id/view`, `POST /companies/:id/whatsapp-click`, `GET /companies/:id/analytics` com isolamento por empresa, rate limit em memória, gating premium; priorização na busca (premium > basic > free, sem ocultar free, helper `sortCompaniesByPlan`, `?prioritize=plan` no backend); admin com seletor de plano e dashboard de analytics no mobile (premium).
- **Decisões-chave:** Plano é fonte da verdade no backend; gating validado server-side; isolamento de tenant em analytics; sem PII; rate limit por IP/sessão; `favorites` removido como métrica morta; `sponsored` removido de Coupon (adiado).

## 23. Admin Redesign (Dark Console)

- **Docs:** `archive/executed/plans/2026-11-12-admin-redesign.md`, `archive/executed/specs/2026-11-12-admin-redesign-design.md`
- **Objetivo:** Redesenhar o painel admin (Tailwind v4, mobile-first, Rubik/Inter, página dedicada de formulário para Empresas).
- **Implementado:** Tailwind v4 via `@tailwindcss/vite` com tokens em `@theme`; componentes-base em `src/components/ui/` (`Button`, `Input/Select/Textarea/CheckboxField`, `Card`, `PlanChip`, `FieldGrid`); shell responsivo (sidebar desktop / drawer mobile) + `MobileTopbar`; `Table` com variante lista mobile (`mobileRows`); restyle das 11 seções; Empresas com página dedicada list/form; limpeza de CSS legado.

## 24. Ciclo de Vida de Assinatura

- **Docs:** `archive/executed/plans/2026-11-12-ciclo-vida-assinatura.md`, `archive/executed/specs/2026-11-12-ciclo-vida-assinatura-design.md`
- **Objetivo:** Vigência do plano (`planStartedAt`/`planExpiresAt`), job diário que rebaixa planos vencidos e notificação proativa (e-mail SMTP + push Expo), gestão de datas no admin.
- **Implementado:** Campos em `Company` (String YYYY-MM-DD) + índice parcial; `PlanNotification` com índice único (dedup claim-first); `updatePlanSchema` com datas (null limpa, undefined mantém, validação cruzada contra estado salvo); `email.service.ts` (smtp/http + `sanitize-html`); `push.service.ts` (`sendPushToTokens`, `sendPushToUser`, `sendPushToCity`); `plan-lifecycle.service.ts` (`computeAction` puro + `runPlanLifecycle` claim-first, notificações em D-7/D-1/expired, rebaixamento no D-0, datas preservadas); cron diário 07:00 `America/Sao_Paulo` (parada de emergência via env); admin com datas no formulário e vigência na listagem; guard anti-escalada (PUT público descarta plan/datas).
- **Decisões-chave:** Fuso `America/Sao_Paulo` (não `America/Brasilia`); D-0 = rebaixamento; duplicação de aviso impedida pelo índice único; escalada impedida por descarte no zod; HTML de e-mail sanitizado.

## 25. Push Center (Admin)

- **Docs:** `archive/executed/plans/2026-11-12-push-center-admin.md`, `archive/executed/specs/2026-11-12-push-center-admin-design.md`
- **Objetivo:** Campanhas de push segmentadas (broadcast/usuário/lista/cidade/plano/favoritos) com envio imediato ou agendado, histórico com tickets/receipts, limpeza de tokens mortos e deep link com whitelist.
- **Implementado:** `PushCampaign` model + DTO com whitelist de deep link (`DEEP_LINK_PADRAO` + `ehDeepLinkValido`); `assertAdminEstrito` (fail-closed); `sendPushToTokens` estendida (tickets + data/image + remoção de token morto); `push-campaign.service.ts` (`resolverSegmento` com opt-out, `enviarCampanha` claim-first, `agendarCampanhasPendentes`, `recuperarCampanhasTravadas`); `push-receipt.service.ts` (cron de receipts, limpeza de tokens mortos, idempotente); rate limit por admin; 6 rotas em `index.ts` (fora do bloco authDeps); crons de 5 min; admin seção "Notificações" (compositor + histórico + detalhe); mobile `notifications-provider` (handler foreground + deep link no tap/cold start com validação na whitelist); `?search=` no `GET /users`.
- **Decisões-chave:** Concorrência no envio via claim-first; opt-out no broadcast (join reverso token→user); token morto sem dupla contagem; cron caído pega agendadas atrasadas; deep link malformado validado no cliente; `sendingStartedAt` como base da auto-recuperação (nunca `updatedAt`).

---

## ⚠️ Parciais

- **Auditoria da Aplicação** (`plans/2026-11-07-auditoria-aplicacao.md`, `specs/2026-11-07-auditoria-aplicacao-design.md`): vários itens de segurança/multi-cidade/testes feitos; pendências como rate limiting global e autorização por recurso.
- **Roteiro E2E Playwright** (`plans/2026-11-04-playwright-e2e-roteiro.md`): specs parciais (tipografia, tabelas); roteiro completo dos 4 perfis não automatizado.
- **Addendum de Filtros do Turismo** (`plans/2026-11-05-modulo-turismo-addendum-filtros.md`): backend feito; verificar aplicação do filtro de cidade na Home mobile.

## ❌ Não implementados

- **Backlog de Novas Funcionalidades** (`plans/2026-11-07-backlog-novas-funcionalidades.md`): notificações in-app, chat, analytics avançado, reviews com foto, favoritos offline.
- **Diagnósticos/escopo** (não são features): `specs/2026-11-02-funcionalidades-frontend-sem-logica.md`, `specs/2026-11-02-guia-cidade-design.md`.
- **Relatório** (não é feature): `test-results/e2e-consolidado.md`.
