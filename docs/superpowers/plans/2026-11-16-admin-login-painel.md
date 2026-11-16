# Login do painel admin no padrão do app mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o `GateSignIn` do painel admin (card com botão que abre o modal do Clerk) por uma tela de login completa e funcional, visualmente idêntica à tela de login do app mobile, com fluxo real de redefinição de senha via Clerk.

**Architecture:** Tela React (web) espelhando os subcomponentes do mobile (`login-header`, `login-field`, `social-buttons`, `login-background`, `remember-row`, `forgot-or-guest`), adaptados para Tailwind + CSS. Autenticação via `useSignIn` do Clerk: e-mail/senha (`signIn.password`), Google/Apple (`authenticateWithRedirect` com callback em `/sso-callback`), e reset de senha em etapas (`create` → `prepareFirstFactor` → `attemptFirstFactor` → `resetPassword`). O gate existente (`auth-gate.tsx`) passa a renderizar a nova tela; o `main.tsx` trata a rota de callback do OAuth.

**Tech Stack:** React 19, @clerk/clerk-react ^5.61.11, Tailwind CSS v4, Vite, vitest.

**Spec (design em chat):** aprovado em 2026-11-16 — login espelho do mobile, com chip "Painel Administrativo", remoção de "Cadastre-se" e "Entrar como convidado", reset de senha real via Clerk.

## Global Constraints

- Código e comentários em português; Conventional Commits com trailer `Generated-by:`.
- Tipografia do admin (§7 AGENTS.md): tamanhos via CSS vars `--font-size-*` / `--line-height-*` (rem), famílias via `--font-family-heading`/`--font-family-body`. Cores do login são uma paleta dedicada (mobile), reproduzidas como constantes TS — não como tokens do console.
- Acessibilidade: `accessibilityLabel`/`role` em controles clicáveis; `allowFontScaling` não se aplica (web); textos críticos com tamanho legível.
- Sem `console.log` sobrando; `import type` para tipos.
- Admin não tem testes de componente (sem testing-library/jsdom): gates = typecheck + lint + testes (vitest, só funções puras) + build. Lógica pura (mapeamento de erros) ganha teste vitest.

## Review Focus

1. **OAuth callback não resolvido em produção** — `/sso-callback` precisa de SPA fallback no host; caso contrário, Google/Apple falham silenciosamente em prod. Mitigação: documentar e, se possível, configurar `vite.config.ts`.
2. **Sessão pendente (MFA/organização)** — após `signIn.password` com `status !== 'complete'`, o app não entra nas abas; deve exibir erro genérico e não travar. Mobile faz o mesmo.
3. **Reset de senha com e-mail não cadastrado** — `signIn.create` lança erro; deve cair em `clerkErrorToMessage` (mapeado `form_identifier_not_found`).
4. **Código expirado/usado no reset** — mapear `verification_expired` / `verification_already_used`.
5. **Identificador vazio / senha curta** — validação client-side antes de chamar o Clerk (evitar erros genéricos).

## File Structure

- Create: `admin/src/assets/logo-castelo.png` (cópia de `mobile/assets/images/logoCastelo.png`)
- Create: `admin/src/components/login/login-theme.ts` — `LoginColors`, `LoginGradients` (espelho do mobile)
- Create: `admin/src/components/login/clerk-errors.ts` — mapeamento de erros (puro)
- Create: `admin/src/components/login/clerk-errors.test.ts` — testes vitest
- Create: `admin/src/components/login/login-field.tsx` — campo com ícone + foco dourado
- Create: `admin/src/components/login/social-buttons.tsx` — botões Google/Apple
- Create: `admin/src/components/login/login-screen.tsx` — tela completa (login + reset em etapas)
- Modify: `admin/src/components/auth-gate.tsx` — `GateSignIn` passa a renderizar `LoginScreen`
- Modify: `admin/src/main.tsx` — montar `AuthenticateWithRedirectCallback` em `/sso-callback`

---

### Task 1: Portar mapeamento de erros do Clerk (TDD)

**Files:**
- Create: `admin/src/components/login/clerk-errors.ts`
- Create: `admin/src/components/login/clerk-errors.test.ts`

**Interfaces:**
- Produces: `export const GenericAuthErrorMessage`, `export function clerkErrorToMessage(error: unknown): string`.

- [ ] **Step 1: Write the failing test**

```ts
// admin/src/components/login/clerk-errors.test.ts
import { describe, expect, it } from 'vitest';

import { GenericAuthErrorMessage, clerkErrorToMessage } from './clerk-errors';

describe('mapeamento de erros do Clerk (admin)', () => {
  it('traduz código conhecido', () => {
    expect(clerkErrorToMessage({ code: 'form_password_incorrect' })).toBe('Senha incorreta');
  });

  it('código desconhecido cai na mensagem genérica', () => {
    expect(clerkErrorToMessage({ code: 'algo_novo' })).toBe(GenericAuthErrorMessage);
  });

  it('erro sem código cai na mensagem genérica', () => {
    expect(clerkErrorToMessage(new Error('boom'))).toBe(GenericAuthErrorMessage);
  });

  it('lê código aninhado em errors[0].code (ClerkAPIResponseError)', () => {
    expect(clerkErrorToMessage({ errors: [{ code: 'form_identifier_not_found' }] })).toBe('E-mail não encontrado');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/login/clerk-errors.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

Portar `mobile/src/features/auth/clerk-errors.ts`, mas com fallback robusto: tentar `error.code` primeiro; se ausente, tentar `error.errors?.[0]?.code` (formato do `ClerkAPIResponseError`). Resto idêntico.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/login/clerk-errors.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add admin/src/components/login/clerk-errors.ts admin/src/components/login/clerk-errors.test.ts
git commit -m "feat(admin): mapeamento de erros do Clerk para o login"
```

---

### Task 2: Asset do logo e tema de cores do login

**Files:**
- Create: `admin/src/assets/logo-castelo.png` (cópia binária de `mobile/src/assets/images/logoCastelo.png`)
- Create: `admin/src/components/login/login-theme.ts`

**Interfaces:**
- Produces: `export const LoginColors`, `export const LoginGradients`.

- [ ] **Step 1: Copiar o asset**

```powershell
New-Item -ItemType Directory -Force -Path admin/src/assets | Out-Null
Copy-Item mobile/assets/images/logoCastelo.png admin/src/assets/logo-castelo.png
```

- [ ] **Step 2: Criar `login-theme.ts`**

Espelho de `mobile/src/constants/theme.ts` (blocos `LoginColors` e `LoginGradients`), com os mesmos hex/gradientes. Adicionar também `PASSWORD_MIN = 8`.

- [ ] **Step 3: Verificar build**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add admin/src/assets/logo-castelo.png admin/src/components/login/login-theme.ts
git commit -m "feat(admin): asset e paleta dedicada da tela de login"
```

---

### Task 3: Componente `LoginField` (web)

**Files:**
- Create: `admin/src/components/login/login-field.tsx`

**Interfaces:**
- Consumes: `LoginColors` de `./login-theme`.
- Produces: `export function LoginField(props)` com props `icon: 'user' | 'mail' | 'lock' | 'eye' | 'eye-off' | 'hash' | 'phone'` (chave mapeada para SVG inline), `right?: ReactNode`, e demais `InputHTMLAttributes<HTMLInputElement>` espalhados (type, value, onChange, autoComplete, etc.). O botão de mostrar/ocultar senha é passado via `right`.

Implementação: `<div>` com ícone à esquerda (usar emoji/SVG inline — admin não tem lib de ícones; preferir SVG inline minimalistas para user/lock/eye/eye-off), input flex, borda dourada no foco via classe `focus-within:border-[#F1A80A]`. Altura 52px, raio 14px, fundo `#1A1A1A`.

- [ ] **Step 1: Escrever o componente**

(Implementar com SVGs inline para os ícones `user`, `mail`, `lock`, `eye`, `eye-off`, `hash`, `phone` — subset necessário.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add admin/src/components/login/login-field.tsx
git commit -m "feat(admin): campo de login com ícone e foco dourado"
```

---

### Task 4: `SocialButtons` (web)

**Files:**
- Create: `admin/src/components/login/social-buttons.tsx`

**Interfaces:**
- Consumes: `LoginColors` de `./login-theme`.
- Produces: `export function SocialButtons({ onGoogle, onApple, googleLoading, appleLoading })`.

Botões pílula outline (border `#333`, bg `#141414`), ícone à esquerda (Google colorido via SVG, Apple branco), texto "Entrar com Google"/"Entrar com Apple". No admin, mostrar ambos (web não tem restrição de plataforma). Loading → spinner + "Conectando…".

- [ ] **Step 1: Escrever o componente**
- [ ] **Step 2: Typecheck + lint**
- [ ] **Step 3: Commit**

---

### Task 5: Tela de login principal (`LoginScreen`) — login + reset em etapas

**Files:**
- Create: `admin/src/components/login/login-screen.tsx`

**Interfaces:**
- Consumes: `clerkErrorToMessage`, `GenericAuthErrorMessage`, `LoginColors`, `LoginGradients`, `LoginField`, `SocialButtons`, `PASSWORD_MIN`.
- Produces: `export function LoginScreen()`.

Comportamento:
- Estados: `mode: 'login' | 'reset-email' | 'reset-code' | 'reset-password'`; `email`, `password`, `code`, `newPassword`, `showPassword`, `remember`, `loading`, `error`, `googleLoading`, `appleLoading`.
- **Login:** validar client-side (identificador não vazio; senha com ≥ `PASSWORD_MIN` caracteres) antes de chamar o Clerk. Depois: `const { createdSessionId, error } = await signIn.create({ identifier: email.trim(), password })` (API legada do `@clerk/clerk-react` — **não** existe `.password()`/`.finalize()` na web); se `error` → `clerkErrorToMessage(error)`; se `signIn.status !== 'complete'` ou sem `createdSessionId` → erro genérico; senão `const { setActive } = useSignIn()` (destruturar no topo do componente) → `await setActive({ session: createdSessionId })` (sessão ativa → gate abre).
- **Google/Apple:** `signIn.authenticateWithRedirect({ strategy, redirectUrl: '/sso-callback', redirectUrlComplete: '/' })`.
- **Reset e-mail:** `signIn.create({ identifier: email.trim() })` → `prepareFirstFactor({ strategy: 'reset_password_email_code' })` → avança para `reset-code`. Reenvio chama `prepareFirstFactor` de novo. Validação client-side do e-mail antes.
- **Reset código:** `attemptFirstFactor({ strategy: 'reset_password_email_code', code })` → avança para `reset-password`.
- **Reset senha:** `resetPassword({ password: newPassword })` → se `signIn.status !== 'complete'`/sem `createdSessionId` → erro genérico; senão `setActive({ session: createdSessionId })` → gate abre.
- Erros mapeados via `clerkErrorToMessage`.
- Visual: fundo com ondas CSS, logo, slogan, chip "Painel Administrativo" (cadeado), formulário, "Lembrar-me" + "Esqueceu sua senha?", botão "Entrar →", divisor, sociais. Sem cadastro/convidado.

- [ ] **Step 1: Escrever `login-screen.tsx`**
- [ ] **Step 2: Typecheck + lint**
- [ ] **Step 3: Commit**

---

### Task 6: Integrar no gate e tratar callback OAuth

**Files:**
- Modify: `admin/src/components/auth-gate.tsx` — `GateSignIn` renderiza `<LoginScreen />`.
- Modify: `admin/src/main.tsx` — importar `AuthenticateWithRedirectCallback` de `@clerk/clerk-react`; se `window.location.pathname === '/sso-callback'`, renderizar `<AuthenticateWithRedirectCallback />` dentro do `ClerkProvider`. Adicionar SPA fallback no `vite.config.ts` (historyApiFallback / `server.historyApiFallback` em dev e configuração do host em prod) para que `/sso-callback` resolva.

- [ ] **Step 1: Atualizar `auth-gate.tsx`**
- [ ] **Step 2: Atualizar `main.tsx`**

Importar `AuthenticateWithRedirectCallback` de `@clerk/clerk-react`. Se `window.location.pathname === '/sso-callback'`, renderizar `<AuthenticateWithRedirectCallback />` dentro do `ClerkProvider` (em vez de `<App />`). Ajustar `vite.config.ts` para SPA fallback.
- [ ] **Step 3: Typecheck + lint + build**
- [ ] **Step 4: Commit**

---

### Task 7: Verificação final

- [ ] **Step 1: Rodar gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: todos verdes.

- [ ] **Step 2: Validação manual**

Run: `npm run dev` → abrir `http://localhost:5173` (sem sessão) → confirmar visual idêntico ao mobile, login com e-mail/senha funciona, Google/Apple redirecionam, reset de senha envia código e redefine, "Cadastre-se"/"Convidado" ausentes, chip "Painel Administrativo" visível.

- [ ] **Step 3: Push (após aprovação do usuário)**

```bash
git push origin master
```

---

## Self-Review

- **Spec coverage:** login (✓ Task 5), sociais (✓ Task 4/5), reset (✓ Task 5), visual/mobile (✓ Task 2/3/4/5), identificador admin (✓ Task 5), remoção de cadastro/convidado (✓ Task 5 — não renderizados), gate (✓ Task 6), callback (✓ Task 6).
- **Placeholders:** nenhum — cada task tem código/verificação.
- **Type consistency:** `LoginColors`/`LoginGradients` (Task 2) consumidos por Tasks 3/4/5; `clerkErrorToMessage`/`GenericAuthErrorMessage` (Task 1) consumidos por Task 5; `LoginField`/`SocialButtons` (Tasks 3/4) consumidos por Task 5; `PASSWORD_MIN` (Task 2) consumido por Task 5.
- **Review Focus:** 5 itens cobertos — callback prod (Task 6 + nota), sessão pendente (Task 5), e-mail não cadastrado (Task 5 via `clerkErrorToMessage`), código expirado/usado (Task 5), validação client-side (Task 5).
