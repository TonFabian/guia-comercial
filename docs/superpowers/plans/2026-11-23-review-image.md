# Review Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir anexar uma imagem (foto) a uma review de empresa, com pipeline de validação fail-closed (tamanho, magic bytes, coerência, moderação +18).

**Architecture:** Campo `image` (base64) no `Review`, validado por `ReviewImageValidatorService` (magic bytes + tamanho + coerência) e `NsfwModerationService` (API externa, fail-closed). Controller fail-fast 400; service revalida antes de persistir. Mobile usa expo-image-picker e envia base64.

**Tech Stack:** Express 5, Mongoose 9, zod, TypeScript strict. Mobile: Expo SDK 58, expo-image-picker.

**Spec:** docs/superpowers/specs/2026-11-23-review-image-design.md

## Global Constraints

- Fail-closed: qualquer erro de validação/scanner/moderação → rejeita (nunca deixa passar).
- Sem URL remota: aceita apenas base64 (data URL ou payload puro).
- Sem persistência de arquivos em disco: imagem transita em memória e é persistida como base64 no Mongo.
- Logs/callbacks nunca contêm o conteúdo da imagem (apenas motivo).
- Validação em dois pontos: controller (400) e service (defesa em profundidade).
- Nomes de env novos: `REVIEW_IMAGE_*`, `NSFW_*`.
- Um comportamento por teste; sem `any`; `import type` para tipos.

## Review Focus

- Executável renomeado para `.jpg` (bytes `4D 5A`) → rejeitado com reason específico.
- Vídeo (MP4 `ftyp`) renomeado para `.png` → rejeitado.
- Arquivo de 6 MB (acima do limite) → 400.
- NSFW API indisponível/timeout → rejeição fail-closed (não persiste).
- Data URL com MIME declarado diferente dos magic bytes → rejeitado (coerência).
- `path`/`href`/URL no campo `image` → 400 (campo deve ser base64 puro ou data URL).

---

### Task 1: Tipos de domínio + env

**Files:**
- Modify: `shared/domain.ts`, `mobile/src/types/domain.ts`, `admin/src/types/domain.ts` (Review interface)
- Create: `backend/.env.example` (file does not exist)

**Interfaces:**
- Produces: `Review.image?: string` nos três arquivos (idênticos) — hard gate: os três devem ter o mesmo campo.

- [ ] **Step 1:** Adicionar `image?: string;` ao `Review` em `shared/domain.ts` e replicar nas cópias mobile/admin. Hard gate: verificar com diff que os três são idênticos no campo image.
- [ ] **Step 2:** Criar `backend/.env.example` (não existe) com:
  ```
  REVIEW_IMAGE_MAX_BYTES=5242880
  NSFW_ENABLED=true
  NSFW_API_URL=https://nsfw-categorize.it/api/upload
  # NSFW_API_KEY=
  NSFW_TIMEOUT_MS=10000
  ```
- [ ] **Step 3:** Commit `feat(domain): campo image opcional em Review`.

### Task 2: DTO zod

**Files:**
- Modify: `backend/src/types/dto.ts` (createReviewSchema)

**Interfaces:**
- Consumes: Review.image?: string.
- Produces: `createReviewSchema` com `image: z.string().min(1).optional()` e `.strict()`.

- [ ] **Step 1:** Write failing test em reviews.test.ts: body com campo `image` string válido passa; body com `path`/`href`/URL extra → 422 (schema strict); body sem image → comportamento atual.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar `image` + `.strict()` (rejeita campos desconhecidos — mass-assignment safety).
- [ ] **Step 4:** Run → PASS. Commit.

Nota: schema-level rejection → 422 `{ error, details }` (padrão validateBody). Validação técnica (magic bytes/tamanho/NSFW) → 400 `{ error, reason }`. Ambos documentados.

### Task 3: NsfwModerationService (fail-closed)

**Files:**
- Create: `backend/src/services/nsfw-moderation.service.ts`, `backend/src/services/nsfw-moderation.service.test.ts`

**Interfaces:**
- Produces: `inspect(buffer: Buffer): Promise<{ allowed: boolean; reason?: string }>`.

Contrato NSFW (API externa):
- Método: POST multipart/form-data, campo `image` = buffer, header opcional `NSFWKEY` quando `NSFW_API_KEY` definido.
- URL default: `https://nsfw-categorize.it/api/upload` (configurável via `NSFW_API_URL`).
- Resposta esperada: `{ status: 'OK', data: { nsfw: boolean, porn: boolean } }` → `nsfw===true || porn===true` ⇒ rejeita.
- `status: 'ERR'` ou `status: 'NOQUOTA'` ⇒ fail-closed (rejeita).
- Timeout/rede/JSON inválido ⇒ fail-closed.
- Se `NSFW_ENABLED=true` e `NSFW_API_URL` ausente ⇒ fail-closed (rejeita) + log warn no boot.
- Se `NSFW_ENABLED=false` ⇒ `{ allowed: true }` + warn log no boot (apenas dev).

- [ ] **Step 1:** Write failing test com fetch mockado: limpa passa; nsfw/porn true rejeita; ERR/NOQUOTA rejeita; timeout/rede/JSON inválido rejeita; NSFW_ENABLED=false passa + warn boot.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar com AbortController (timeout NSFW_TIMEOUT_MS). Logar apenas reason, nunca conteúdo.
- [ ] **Step 4:** Run → PASS. Commit.

### Task 4: ReviewImageValidatorService (magic bytes + tamanho + coerência + NSFW)

**Files:**
- Create: `backend/src/services/review-image-validator.service.ts`, test.

**Interfaces:**
- Produces: `validate(input: string): Promise<{ ok: true; base64: string } | { ok: false; reason: string }>`.

Magic-byte allowlist (detecção por bytes, não por extensão/MIME declarado):
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- GIF: `47 49 46 38` (`GIF8`)
- WebP: `52 49 46 46 ?? ?? ?? ?? 57 45 42 50` (RIFF....WEBP)

Parsing rules:
- Aceita data URL `data:image/<subtype>;base64,<payload>` ou payload base64 puro.
- Se data URL: extrai MIME declarado; deve bater com magic bytes detectado (coerência).
- Se payload puro: detecta apenas por magic bytes.
- `path`/`href`/URL → rejeita (não é base64 válido).
- Tamanho decodificado ≤ `REVIEW_IMAGE_MAX_BYTES`.
- Chama `NsfwModerationService.inspect(buffer)`; fail-closed propaga.

- [ ] **Step 1:** Write failing test cobrindo: jpg/png/webp/gif válidos passam; executável (MZ `4D 5A`) rejeitado; MP4 (`ftyp`) rejeitado; 6MB rejeitado; data URL MIME divergente rejeitado; payload não-base64 rejeitado; NSFW fail-closed propagado.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar parse → tamanho → magic bytes → coerência → NSFW. Nunca logar buffer/conteúdo; apenas reason.
- [ ] **Step 4:** Run → PASS. Commit.

### Task 5: Integrar no review.service + controller

**Files:**
- Modify: `backend/src/services/review.service.ts` (createReview assinatura + validação)
- Modify: `backend/src/controllers/review.controller.ts`
- Modify: `backend/src/models/review.model.ts` (campo `image: { type: String }`, opcional, sem default)

**Interfaces:**
- Consumes: ReviewImageValidatorService.validate.
- Produces: `createReview(companyId, clerkId, rating, comment?, image?)`.

Controller: extrair `image` de `req.body`; se presente, chamar validator via service; mapear `{ ok:false, reason }` → 400 `{ error: 'Imagem inválida', reason }` (nunca 500). Service re-roda validação antes de persistir (defesa em profundidade).

- [ ] **Step 1:** Write failing test em reviews.test.ts: POST com imagem válida → 201 e review.image presente; POST com imagem inválida → 400 `{error,reason}`; POST sem imagem → comportamento atual inalterado.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar service + controller + model.
- [ ] **Step 4:** Run → PASS. Commit.

### Task 6: Mobile — seletor de imagem

**Files:**
- Modify: `mobile/src/services/api.ts` (createReview assinatura; propagar ApiError em 4xx)
- Modify: `mobile/src/features/company/company-reviews.tsx`
- Create/modify: `mobile/package.json` via `npx expo install expo-image-picker`

**Interfaces:**
- Consumes: createReview(companyId, rating, comment?, image?).

Formato canônico cliente: expo-image-picker retorna base64 puro (sem prefixo data URL) em `asset.base64`; envia-se o payload puro. Backend aceita ambos (data URL ou puro) per Task 4.

`createReview` deve propagar `ApiError` (com `status` e `body`) em 4xx para a UI exibir `reason`; não engolir erros de validação.

- [ ] **Step 1:** `npx expo install expo-image-picker`.
- [ ] **Step 2:** Atualizar `createReview` para aceitar `image?` e propagar ApiError.
- [ ] **Step 3:** Adicionar botão "Adicionar foto", ImagePicker (mediaTypes Images), preview, remover; enviar base64 ao publicar; tratar erro exibindo `reason`.
- [ ] **Step 4:** Typecheck + lint. Commit.

### Task 7: Gate completo

**Files:**
- (nenhum novo)

- [ ] **Step 1:** Backend: `npm run lint` · `npm run typecheck` · `npm test`.
- [ ] **Step 2:** Mobile: `npx expo lint` · `npm run typecheck` · grep tipografia (`fontSize:\s*\d` e `fontWeight: '[0-9]+'` fora de theme.ts).
- [ ] **Step 3:** Verificar três arquivos de domínio sincronizados (diff de `Review`).
- [ ] **Step 4:** `npm audit` (backend/mobile) — sem vulnerabilidades críticas novas.
- [ ] **Step 5:** Grep de segurança: nenhum `fs.writeFile`/disk write no validator; nenhum log contendo buffer/base64 (teste unitário assertando ausência).
- [ ] **Step 6:** Commit final se necessário.

## File Structure

- `shared/domain.ts`, `mobile/src/types/domain.ts`, `admin/src/types/domain.ts` — `Review.image?: string`.
- `backend/src/models/review.model.ts` — campo `image`.
- `backend/src/types/dto.ts` — `createReviewSchema` (+image, strict).
- `backend/src/services/nsfw-moderation.service.ts` (+test).
- `backend/src/services/review-image-validator.service.ts` (+test).
- `backend/src/services/review.service.ts`, `backend/src/controllers/review.controller.ts`.
- `backend/.env.example` (create).
- `mobile/src/services/api.ts`, `mobile/src/features/company/company-reviews.tsx`.

## Self-Review

- Spec coverage: todos os goals (image field, upload, validação técnica, NSFW fail-closed, mobile) mapeados a tasks.
- Type consistency: nomes reconciliados (`ReviewImageValidatorService.validate`, `NsfwModerationService.inspect`).
- Review Focus: todos os 6 itens têm teste correspondente (Task 4/5).
- Proportion: plano não contém corpos de função além de assinaturas.

---

**Plan complete.** Please review. Which execution approach? I recommend subagent-driven given multi-task dependencies and security-critical validation. Does the plan capture what you want?