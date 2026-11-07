# Plano de Ação — Auditoria Completa da Aplicação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Endereçar os achados da auditoria completa (incorporados no spec): segurança, multi-cidade, tipos, testes admin, CI, tipografia.

**Architecture:** Tarefas independentes por tema; priorizar blockers de segurança antes de features.

**Tech Stack:** Node/Express, Expo/RN, Vite/React, Vitest.

**Spec:** docs/superpowers/specs/2026-11-07-auditoria-aplicacao-design.md

## Global Constraints

- Sem segredos no código; env via .env.
- Modo legado desabilita auth; produção deve exigir Clerk.
- npm (não bun/pnpm); expo install para mobile.
- lint + typecheck + tests verdes por app.

## Review Focus

- Falha de startup em produção sem Clerk.
- Drift de tipos entre os 3 domain.ts.
- Regressão de testes admin.

---

### Task 1: Gate de startup (produção exige Clerk)

**Files:** backend/src/config.ts (novo) ou backend/src/index.ts
- [ ] Criar validateProductionConfig() que lança se NODE_ENV=production e !CLERK_SECRET_KEY.
- [ ] Chamar em index.ts antes de listen; exit code 1, mensagem "CLERK_SECRET_KEY obrigatório em produção".
- [ ] Teste: backend/src/config.test.ts.

### Task 2: Rate limiting

**Files:** backend/src/app.ts (ou middleware)
- [ ] Instalar express-rate-limit@^7 (npm i express-rate-limit).
- [ ] Env: RATE_LIMIT_WINDOW_MS (default 60000), RATE_LIMIT_MAX (default 100).
- [ ] Aplicar em rotas públicas (companies, jobs, coupons, notices).
- [ ] Testes: 429 após limite.

### Task 3: Teste de equivalência de tipos de domínio

**Files:** backend/src/types/domain-equivalence.test.ts (novo)
- [ ] Comparar textualmente shared/domain.ts, mobile/src/types/domain.ts, admin/src/types/domain.ts; falhar se divergirem.
- [ ] Adicionar ao CI.

### Task 4: Multi-cidade — plano de migração

**Files:** docs/superpowers/plans/ (novo spec)
- [ ] Grep "Castelo do Piauí" / cidade hardcoded.
- [ ] Especificar default city, persistence key (AsyncStorage), GPS permission flow, fallback.
- [ ] Remover hardcode.

### Task 5: Expandir testes admin

**Files:** admin/src
- [ ] Listar seções: Dashboard, Companies, Jobs, Coupons, Notices, Users.
- [ ] Testes de render + api client (mock) para cada.

### Task 6: CI (GitHub Actions)

**Files:** .github/workflows/ci.yml
- [ ] Node LTS; jobs: backend (lint/typecheck/test), admin (lint/typecheck/build), mobile (typecheck + expo export).

### Task 7: Grep gate de tipografia

**Files:** mobile
- [ ] Regex: fontSize:\s*\d e fontWeight: '[0-9]+' fora de theme.ts.
- [ ] Adicionar step no CI.

### Task 8: Novas funcionalidades (backlog)

- [ ] Notificações in-app, chat lojista-cliente, analytics de cliques, avaliações com foto, favoritos offline.
- [ ] Métricas: MAU, cliques em WhatsApp/telefone, conversão cupom. Priorizar por impacto.