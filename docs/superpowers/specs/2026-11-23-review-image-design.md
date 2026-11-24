# Spec: Imagem em Review (comentário de empresa)

**Data:** 2026-11-23
**Status:** Rascunho para aprovação

## 1. Intent

Permitir que um usuário autenticado anexe **uma** imagem (foto) a uma avaliação
(review) de empresa. A imagem é armazenada como base64 no próprio documento
`Review` (abordagem 1 — sem infra de storage). A API aplica pipeline de
validação **fail-closed**: nenhuma imagem maliciosa, executável, vídeo,
documento ou conteúdo inapropriado (+18) pode atravessar.

## 2. Goals / Non-goals

**Goals**
- Campo opcional `image` (string base64/data URL) em `Review`.
- Upload via `POST /companies/:id/reviews` aceitando `image` no body JSON (base64).
- Validação técnica: tamanho ≤ `REVIEW_IMAGE_MAX_BYTES` (default 5MB, customizável),
  formato permitido por magic bytes (jpg/jpeg/png/webp/gif), coerência
  extensão×bytes, rejeição de não-imagens (executáveis, vídeos, documentos, scripts).
- Moderação de conteúdo +18 via serviço externo (fail-closed).
- Mobile: seletor de imagem (expo-image-picker), preview, envio base64.

**Non-goals**
- Múltiplas imagens por review (apenas 1).
- Storage externo / S3 / disco (base64 no Mongo).
- Moderação local (nsfwjs/tensorflow) — apenas API externa plugável.
- Moderação de texto do comentário (fora de escopo).
- Admin UI para reviews (apenas tipos).

## 3. Constraints (segurança)

- **Fail-closed em todas as camadas:** erro de validação, scanner indisponível,
  resultado ambíguo → rejeita. Nunca "deixa passar".
- **Sem URL remota:** aceita apenas `content` base64. `path`/`href`/URLs não
  são aceitos (elimina SSRF).
- **Sem persistência de arquivos:** nenhum write em disco/tempfile. A imagem
  transita em memória e é persistida apenas como base64 no Mongo (campo do
  Review).
- **Logs/callbacks nunca contêm o conteúdo** da imagem (apenas motivo).
- Validação em dois pontos: controller (fail-fast 400) e service (defesa em
  profundidade). Para base64, a validação ocorre no controller antes de
  persistir; o service revalida magic bytes antes de gravar.
- Nomes de env novos começam com `REVIEW_IMAGE_` / `NSFW_`.

## 4. Abordagem escolhida

Abordagem 1 (base64 no Mongo). Motivo: YAGNI — repo sem infra de storage;
migração futura para storage externo não muda o contrato (`image` continua
string).

## 5. Design

### 5.1 Domínio

`Review` ganha `image?: string` (base64 puro ou data URL) em:
- `shared/domain.ts`
- `mobile/src/types/domain.ts`
- `admin/src/types/domain.ts`

### 5.2 Backend

**DTO** (`backend/src/types/dto.ts`):
```ts
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
  image: z.string().min(1).optional(), // base64 ou data URL
});
```
Validação adicional (tamanho, magic bytes, moderação) no service/controller via
`ReviewImageValidator`.

**Modelo** (`review.model.ts`): campo `image: { type: String }`.

**Serviço** `review.service.ts`: `createReview(companyId, clerkId, rating, comment?, image?)`.
Antes de gravar, chama `validateReviewImage(image)`:
1. Decodifica base64 (aceita data URL `data:image/...;base64,...` → extrai payload).
2. Tamanho decodificado ≤ `REVIEW_IMAGE_MAX_BYTES`.
3. Magic bytes ∈ allowlist (jpg/jpeg/png/webp/gif). Rejeita executáveis,
   vídeos, documentos, scripts.
4. Coerência: se data URL declarou MIME, deve bater com magic bytes detectado.
5. Moderação NSFW via `NsfwModerationService.inspect(buffer)` (imagens apenas).
   Fail-closed.
6. Persiste apenas o base64 validado.

**Novo serviço** `backend/src/services/review-image-validator.service.ts`:
- `validate(imageInput): Promise<{ ok: true; base64: string } | { ok: false; reason: string }>`
- Ordem: parse → tamanho → magic bytes → coerência → NSFW.
- NSFW: `NsfwModerationService` chama API externa (env `NSFW_API_URL`,
  `NSFW_API_KEY` opcional, `NSFW_TIMEOUT_MS`). Se `NSFW_ENABLED=false`, loga
  warn no boot e pula (apenas dev). Timeout/rede/JSON inválido → fail-closed.

**Controller** `review.controller.ts`: extrai `image` do body, passa ao service.
Erros de validação → 400 com `{ error, reason }`.

### 5.3 Env

```
REVIEW_IMAGE_MAX_BYTES=5242880   # 5MB, customizável
NSFW_ENABLED=true
NSFW_API_URL=https://...         # default a definir
NSFW_API_KEY=                    # opcional
NSFW_TIMEOUT_MS=10000
```

### 5.4 Mobile

`company-reviews.tsx`:
- Botão "Adicionar foto" visível quando logado.
- `expo-image-picker` (ImagePicker.launchImageLibraryAsync) com
  `mediaTypes: Images`, `quality`, `base64: true`.
- Preview da imagem selecionada + botão remover.
- Ao publicar, envia `image` (base64) no `createReview`.
- `api.ts`: `createReview(companyId, rating, comment?, image?)`.

### 5.5 Admin

Apenas tipos (`Review.image`). Sem UI no MVP.

## 6. Abordagens consideradas

- **A (escolhida): base64 no Mongo** — sem infra nova, contrato estável.
- **B: multer + disco local** — rejeitada: infra de storage, volume persistente,
  cleanup; YAGNI.
- **C: cloud storage** — rejeitada: escopo/credenciais; pode ser migração futura
  sem mudar contrato.

## 7. Riscos / lacunas

- Documentos Mongo podem crescer (5MB × N reviews). Mitigação futura: migrar
  para storage externo mantendo campo `image` como URL.
- Moderação +18 depende de API externa; se indisponível → fail-closed
  (review rejeitada). Mitigação: NSFW_ENABLED=false apenas em dev.
- Moderação de texto não coberta.

## 8. Testes

- Unit: validator (magic bytes, tamanho, coerência, NSFW mock fail-closed).
- Integração: rota POST com imagem válida → 201; inválida → 400.
- Mobile: não testável em CI sem device; verificação manual.
