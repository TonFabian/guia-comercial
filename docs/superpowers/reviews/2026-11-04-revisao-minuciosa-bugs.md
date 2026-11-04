# Revisão minuciosa — bugs e furos de fluxo (toda a aplicação)

**Data:** 2026-11-04  
**Escopo:** backend (Express 5 + Mongoose 9), mobile (Expo SDK 58 / RN 0.88), admin (Vite + React).  
**Metodologia:** leitura estática completa de `src/` nos três apps + verificação dos gates (typecheck, lint, testes, build). Nenhum arquivo de código foi alterado nesta revisão.  
**Fontes:** relatórios dos 3 revisores (backend, mobile, admin) + verificação direta no código.

Legenda de severidade: **CRITICAL** (quebra/segurança/dados) · **HIGH** · **MEDIUM** · **LOW**.

---

## CRITICAL

### Backend
1. **Mutação aberta em recursos de catálogo (sem auth)** — `backend/src/controllers/{banner,category,coupon,job}.controller.ts` (`create`/`update`/`remove` não checam `req.auth?.clerkId`); services não chamam `assertAdmin`. Qualquer cliente cria/edita/exclui banners, categorias, cupons e vagas (mesmo com Clerk ligado).
2. **Convidado recebe contato de profissionais autônomos** — `backend/src/utils/guest.ts`: `Scrubbed<T>` só redige `Company`/`Coupon`; `AutonomousProfessional` (phone/whatsapp) passa intacto.
3. **Registro de push token aceita `clerkId` do body e não exige sessão** — `push-token.controller.ts:5-13`, `push-token.service.ts:3-9`. Spoofing/sequestro de token.
4. **Broadcast de notificações é público quando `NOTIFY_SECRET` não está definido** — `push-token.controller.ts:15-17`, `notification.controller.ts:7-9` (`if (secret && ...)`).
5. **Ausência de DTOs/validação zod para `autonomous-professionals` e `cities`** — `routes/index.ts:113-118,127-130` + controllers passam `req.body` direto ao service → mass assignment.
6. **`AutonomousProfessional.update` não resolve `city` (slug → ObjectId)** — `autonomous-professional.service.ts:38-45` → `CastError` ou gravação inválida.
7. **Redação de convidado não é montada em modo legado** — `routes/index.ts:44-59`: `routes.use(guestScrub())` dentro de `if (authDeps)`. Em modo legado, contatos não são redigidos.

### Mobile
8. **Falsa confirmação de sucesso em "Minha empresa"** — `mobile/src/app/my-company.tsx:71-109`: `updateCompany` engole erro (`api.ts` retorna `null`), mas o app atualiza estado local e mostra "sucesso".
9. **Falsa confirmação de sucesso no perfil** — `mobile/src/app/(tabs)/profile.tsx:86-108`: `Alert('Dados atualizados com sucesso')` mesmo quando `updateMe` retorna `null`.
10. **Crash nativo no retry da Home** — `mobile/src/app/(tabs)/index.tsx:149`: `window.location.reload()` (não existe no RN nativo).
11. **Fallback com dados mockados em produção** — `mobile/src/services/api.ts:67-91, 179-197, 136-148, 150-161`: `allowMockFallback` + `items.length === 0` → mock aparece em prod quando o backend retorna vazio.

---

## HIGH

### Backend
12. **Mutations de cupom/banner/categoria/vaga não aplicam autorização no service** — `coupon.service.ts`, `banner.service.ts`, `category.service.ts`, `job.service.ts` sem `assertAdmin`/`assertOwner`.
13. **`createCompany`/`updateCompany` aceitam `category` como string livre** — `dto.ts:62`, `company.service.ts:123-124,199` → cliente deve enviar ObjectId hex; slug inválido vira `CastError`.
14. **`listCompanies` permite enumeração por `owner` sem verificar identidade** — `company.service.ts:70-72`.
15. **Push token: `upsert` pode lançar E11000 não tratado** — `push-token.service.ts:4-8` → 500 sob concorrência.
16. **`listAllPushTokens` não filtra documentos sem token** — `push-token.service.ts:11-14`.
17. **`mapError` prioriza `statusCode` sobre `code 11000`** — `error.middleware.ts:34-54`.
18. **`errorHandler` registra erro completo via `console.error` em 5xx** — `error.middleware.ts:75-77` (PII/stack em logs).
19. **`validateBody` responde 422 mas o mapeamento documenta ZodError → 400** — `dto.ts:23`.
20. **DTOs de notice não validam datas com `isoDate`** — `dto.ts:177-178`.
21. **Violação de índice único não tratada em vários services** — `city`, `banner`, `coupon`, `job`, `notice`, `public-utility` → 500 em vez de 409.
22. **`assertAdmin` não permite modo legado, enquanto `assertOwner` permite** — `user.service.ts:17-29` vs `company.service.ts:138-157`.
23. **`parsePagination` trata `pageSize=0` como default** — `http.ts:26-28`.

### Mobile
24. **Vazamento de memória / setState após unmount na Home** — `use-home-data.ts:52-124` (sem `cancelled`), `index.tsx:80-141`.
25. **Favoritos não isolados por usuário/conta** — `favorites-provider.tsx:40-64` (privacidade).
26. **Tela de Favoritos não é rolável** — `favorites.tsx:30` (`.map()` em `<View>`).
27. **Busca usa `ScrollView` + `.map()` para resultados** — `search.tsx:285,404` (deveria ser `FlatList`).
28. **`console.log` do token de push em produção** — `auth-provider.tsx:104`.
29. **Dois contratos de push-token** — `auth-provider.tsx:96` (fetch direto) vs `api.ts:252` (`/me/push-token`).
30. **Favoritos remotos: N requisições seriais, sem tratamento de erro** — `favorites-provider.tsx:70-88`.
31. **Persistência de favoritos sem debounce → rajada de PUTs** — `favorites-provider.tsx:94-106`.
32. **`toDomainUser` pega `phone` do Clerk, não do backend `/me`** — `auth-provider.tsx:140-155`.
33. **`saveProfile` não atualiza phone/imageUrl no Clerk** — `profile.tsx:98-100`.
34. **`getMe`/`updateMe` usam cast `as User`** — `api.ts:211,222`.
35. **Push: `projectId` pode ser undefined em alguns builds** — `auth-provider.tsx:81`.
36. **`nearMe` (geolocalização) não é cancelável** — `search.tsx:170-191`.
37. **Busca: "Carregar mais" pode ser disparado várias vezes** — `search.tsx:287-291`.
38. **`useEffect` de categorias sem retry/erro visível** — `search.tsx:88-101`.
39. **Geocodificação em lote no Mapa (sem limite/cancelamento)** — `map.tsx:27-48`.
40. **`CompanyGallery` usa dados de teste em dev** — `company-gallery.tsx:247`.
41. **`WorkingHoursCard` recalcula status com `setInterval` de 60s** — `company-detail-screen.tsx:63-66`.
42. **Busca por voz: handlers nativos sobrescritos, sem cleanup** — `use-voice-search.ts:85-162`.
43. **`interactive-map` não reage a mudanças de `companies`** — `interactive-map.tsx:26`.
44. **`guest` persistido: `AsyncStorage.getItem` sem `.catch`** — `auth-provider.tsx:59-62`.
45. **Favoritos: race inicial (toggle antes de `ready` pode ser sobrescrito)** — `favorites-provider.tsx:94`.

### Admin
46. **Código morto pré-existente** — `apiGet` em `api.ts` e `components/badge.tsx` não usados.
47. **`GET /cities` não é paginado** — lista pura (já tratado no admin).

---

## MEDIUM

### Backend
48. **`public-utility` mutations não compatíveis com modo legado** — `public-utility.controller.ts:36-78`.
49. **`coupon`/`job` DTOs não validam formato de `company` (ObjectId)** — `dto.ts:112,129`.
50. **Empresa não permite limpar `city` (DTO usa `optional`, não `nullish`)** — `dto.ts:66`, `company.service.ts:179-185`.
51. **Cidade inválida/ausente em `createCompany` cai silenciosamente em Castelo do Piauí** — `company.service.ts:110-119`.
52. **`notFoundHandler` expõe `req.path`** — `not-found.middleware.ts:5`.
53. **`notification.controller.ts` duplica `broadcastPush`** — código morto.
54. **`review.controller.ts`, `push-token.controller.ts`, `notification.controller.ts` não usam `asyncHandler`**.
55. **Guest scrub só intercepta `res.json`, não `res.send`/`res.end`** — `guest.middleware.ts:13-23`.
56. **Seed não atômico** — `seed.ts:28-42`.
57. **Seed não define `ownerClerkId` nem valida referências de cidade** — `seed.ts:88-280`.
58. **`User.ownedCompanyIds` é `string[]`, mas company `_id` é string de domínio** — `user.model.ts:23`.

### Mobile
59. **Navegação com `as any` (rotas tipadas desabilitadas)** — `other-companies.tsx:48`, strings em `search.tsx`.
60. **`http.ts`: erros não-401/403 viram `null`** — `http.ts:120-131`.
61. **`http.ts`: `response.json()` sem try/catch** — corpo não-JSON lança.
62. **Acessibilidade incompleta em vários clicáveis** — `profile.tsx:139`, `search.tsx:260`, `category-list.tsx`, `favorites.tsx`.
63. **`interactive-map` não reage a mudanças de `companies`** — `interactive-map.tsx:26`.
64. **Lint: `useCallback` com dependência `colors` faltando** — `company-gallery.tsx:305,312`.
65. **Lint: import em corpo de módulo** — `links.ts:66`.
66. **Lint: `require()` proibido (voz)** — `use-voice-search.ts:62` (intencional).
67. **Lint: `system` não usado** — `theme-provider.tsx:18`.
68. **Lint: `SHOW_COUPONS` não usado** — `index.tsx:35`.
69. **Lint: `getCompanies` não usado** — `profile.tsx:9`.

### Admin
70. **`GET /cities` não é paginado** — lista pura (já tratado no admin).
71. **Código morto pré-existente** — `apiGet` em `api.ts` e `components/badge.tsx` não usados.

---

## LOW

### Mobile
72. **Código morto / não utilizado** — `company-actions-bar.tsx`, `company-actions.ts` (`buildCompanyActions` não usado na tela de detalhe), `links.ts:69` (`shareCompany`), `SHOW_COUPONS`, `getCompanies` (profile), `public-utility.ts` (removido nesta sessão).
73. **`CompanyGallery` usa dados de teste em dev** — `company-gallery.tsx:247`.
74. **`WorkingHoursCard` recalcula status com `setInterval` de 60s** — `company-detail-screen.tsx:63-66`.
75. **`CompanyGallery` usa `useCallback` com deps `colors` faltando** — `company-gallery.tsx:305,312`.
76. **`Favorite` remove button sem `accessibilityState`** — `favorites.tsx`.
77. **`interactive-map` não reage a mudanças de `companies`** — `interactive-map.tsx:26`.
78. **`links.ts` duplica `onlyDigits` (local `toDigits`)** — `links.ts:10-12`.
79. **`features/profile/phone.ts` e `format.ts` são duplicatas** — dois arquivos de 1 linha idênticos.
80. **`emergency-phones-modal.tsx` e `public-utility-section.tsx` removidos** (código morto).

### Backend
81. **`notFoundHandler` expõe `req.path`** — `not-found.middleware.ts:5`.
82. **`User.ownedCompanyIds` é `string[]`, mas company `_id` é string de domínio** — `user.model.ts:23`.
83. **`notification.controller.ts` duplica `broadcastPush`** — código morto.
84. **Seed não atômico** — `seed.ts:28-42`.
85. **Seed não define `ownerClerkId` nem valida referências de cidade** — `seed.ts:88-280`.

---

## Pontos conformes (sem achado)

- `backend/src/config/db.ts`: `MONGODB_URI` obrigatória, sem default silencioso.
- `backend/src/middlewares/error.middleware.ts`: assinatura com 4 parâmetros; mapeia `ValidationError`/`CastError`/`11000`/`ZodError`/`statusCode`; em produção não vaza stack na resposta.
- `backend/src/routes/index.ts`: `/health` fora do bloco Clerk; webhook montado antes do `express.json` em `app.ts`; `notFoundHandler` e `errorHandler` após rotas.
- `backend/src/utils/guest.ts`: redação por cópia (imutável), cobre `company` populado em cupom/vaga.
- `backend/src/services/company.service.ts`: `escapeRegex` aplicado na busca textual.
- `mobile/src/services/api.ts`: fallback de mock apenas em `__DEV__` ou `!isApiConfigured()` em produção (mas veja item 4 — caso de resposta vazia).
- TypeScript strict em todos os apps; lint 0 erros.

---

## Resumo por prioridade

| Severidade | Quantidade | Ação sugerida |
|---|---|---|
| CRITICAL | 11 | Corrigir antes de expor a API publicamente (auth em banner/category/coupon/job; guest redaction para autonomous; push token spoofing; broadcast secret; mobile falsa confirmação; window.reload crash; mock em prod) |
| HIGH | 34 | Corrigir antes do próximo release (memória, favoritos, console.log token, push duplicado, validação DTO, etc.) |
| MEDIUM | 23 | Melhorias de robustez e UX |
| LOW | 15 | Limpeza de código morto e refinamentos |

## Próximos passos sugeridos

1. **Prioridade 1 (CRITICAL):** fixar a autorização em banner/category/coupon/job, fechar o sequestro de push token, adicionar scrubbing para `AutonomousProfessional`, montar guest scrub em modo legado, corrigir `window.location.reload` na Home, e remover o fallback mock em produção.
2. **Prioridade 2 (HIGH):** corrigir falsa confirmação de salvamento (my-company, profile), favoritos por usuário, não-rolável de Favoritos, busca com `FlatList`, remover `console.log` do token.
3. **Prioridade 3 (MEDIUM):** distinguir erros HTTP no mobile, validar DTOs, corrigir `mapError` (11000), `parsePagination(0)`.
4. **Prioridade 4 (LOW):** limpeza de código morto e refinamentos.