# Owner de empresa gerencia Jobs e Cupons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Permitir que o dono da empresa vinculada a um Job/Coupon faça CRUD, além de admins.

**Architecture:** Substituir `assertAdmin` por `assertOwnerOrAdmin` em `job.service.ts` e `coupon.service.ts`, resolvendo a empresa do recurso. Proibir mudança de `company` no update.

**Tech Stack:** Node/Express, Mongoose, Vitest, Zod.

**Spec:** `docs/superpowers/specs/2026-11-07-owner-empresa-jobs-cupons-design.md`

## Global Constraints

- Modo legado (sem `CLERK_SECRET_KEY`) desabilita autorização.
- Recurso inexistente → 404; sem sessão → 401; sem permissão → 403.
- `company` não pode ser alterado no update.
- `npm run typecheck` e `npm test` verdes.

## Review Focus

- Dono de empresa A tentando editar job de empresa B → 403.
- Usuário comum (sem role admin, não owner) → 403.
- Update tentando trocar `company` → ignorado (não muda titularidade).
- Create com `company` inexistente → 404.

---

### Task 1: Autorização em job.service.ts

**Files:**
- Modify: `backend/src/services/job.service.ts`

**Interfaces:**
- Produces: `createJob(dto, clerkId?)`, `updateJob(id, dto, clerkId?)`, `deleteJob(id, clerkId?)` com assertOwnerOrAdmin.

- [ ] Step 1: Importar `assertOwnerOrAdmin` e `CompanyModel`.
- [ ] Step 2: Implementar `createJob`: buscar `CompanyModel.findById(dto.company)`; se não existir → throw 404 'empresa não encontrada'; checar owner/admin via `assertOwnerOrAdmin` com `findResource` retornando a empresa (exists/ownerClerkId); depois criar.
- [ ] Step 3: Implementar `updateJob`/`deleteJob`: buscar Job; se não existir → 404; resolver empresa via `CompanyModel.findById(job.company)` (se empresa não existir → 404); chamar `assertOwnerOrAdmin` com `findResource` retornando `{ exists: !!company, ownerClerkId: company?.ownerClerkId }`. Ignorar `company` no dto.
- [ ] Step 4: Rodar typecheck + testes.

### Task 2: Autorização em coupon.service.ts

**Files:**
- Modify: `backend/src/services/coupon.service.ts`

- [ ] Step 1: Importar `assertOwnerOrAdmin` e `CompanyModel`.
- [ ] Step 2: Implementar create/update/delete análogo ao job.
- [ ] Step 3: Rodar typecheck + testes.

### Task 3: Garantir descarte de `company` no update (zod/DTO)

**Files:**
- Modify: `backend/src/types/dto.ts` (UpdateJobDto/UpdateCouponDto) se necessário.

- [ ] Step 1: Tornar `UpdateJobDto`/`UpdateCouponDto` como `Omit<Partial<Create...>, 'company'>` em `dto.ts` (linhas ~152, ~168). Também ignorar no service (defesa em profundidade).
- [ ] Step 2: Rodar testes.

### Task 4: Testes de segurança (owner vs comum)

**Files:**
- Modify: `backend/src/routes/security.test.ts` (ou adicionar cenários).

- [ ] Step 1: Adicionar cenários owner (200/204) e comum (403) para jobs/cupons.
- [ ] Step 2: Rodar testes.
