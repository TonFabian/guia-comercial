# Sair & Tema — Design

## Intent

Adicionar confirmação antes de sair da conta e garantir que, após o logout, a
aba Perfil volte ao estado **Visitante**. A seção **Configurações** já foi
entregue; este ciclo cobre **D (Sair)** e verifica **E (Tema)**.

## Escopo

- **In scope:**
  - Modal temático de confirmação com a mensagem
    “Deseja realmente sair da sua conta?”.
  - Ação dedicada `signOutToGuest` no `AuthProvider`.
  - Após confirmar, o Clerk encerra a sessão e o Perfil volta a `guest`
    (Visitante), sem redirecionar para o sign-in.
  - Verificação e teste do tema: Escuro como padrão, Claro selecionável e
    preferência persistida.
- **Out of scope:**
  - Alterar a seção Configurações já entregue.
  - Sincronizar tema no backend.
  - Criar fluxo de exclusão de conta.
  - Redesenhar o sign-in ou o guard das abas.

## Decisões

| Tema | Decisão |
| --- | --- |
| Confirmação | Modal próprio (`Modal` do React Native), transparente, com overlay e botões Cancelar/Sair. |
| Ação de logout | Novo `signOutToGuest` no `AuthProvider`; `signOut` continua existindo para logout completo. |
| Estado final | `guest`: header Visitante, menu com “Entrar ou cadastrar” e sem “Sair”. |
| Falha no logout | Mantém a sessão atual, fecha o loading e mostra `Alert` de erro. |
| Tema | Já funcional; extrair `resolveThemeMode` puro para testar o default escuro. |
| Persistência | `AsyncStorage` com chave `guia.theme.mode`, como hoje. |

## Arquitetura

```
mobile/src/
  features/profile/
    profile-screen.tsx        → abre o modal no item Sair
    sign-out-modal.tsx        → modal presentacional (novo)
  providers/
    auth-provider.tsx         → signOutToGuest
    theme-provider.tsx        → usa resolveThemeMode
    theme-mode.ts             → função pura + teste (novo)
```

## Fluxo de Sair

1. Usuário logado toca em **Sair**.
2. `ProfileScreen` abre o modal com:
   - Título: “Sair da conta?”
   - Mensagem: “Deseja realmente sair da sua conta?”
   - Botões `Cancelar` e `Sair`.
3. `Cancelar`, backdrop ou botão voltar fecham o modal sem efeito.
4. `Sair`:
   - Marca `signingOut` e desabilita os botões.
   - Chama `signOutToGuest()`.
   - O provider ativa o modo convidado e chama o `signOut` do Clerk.
   - Ao concluir, fecha o modal; a tela re-renderiza como Visitante.
5. Em erro, mantém a sessão, fecha o loading e mostra um `Alert`.

## AuthProvider

```ts
interface AuthState {
  // ...
  signOut: () => Promise<void>;
  signOutToGuest: () => Promise<void>;
}
```

- **Dev sem Clerk:** `signOutToGuest` é no-op.
- **Clerk:** ativa `guest = true` em memória antes de chamar o `signOut` do
  Clerk; assim o guard não redireciona para o sign-in quando a sessão cai.
  Persiste a flag após o sucesso e reverte `guest` se o Clerk falhar.
- `signOut` existente continua limpando o modo convidado.

## Tema

- `resolveThemeMode(stored)`:
  - `'light'` → light;
  - `'dark'` → dark;
  - qualquer outro valor/ausente → dark.
- `ThemeProvider` usa a função ao carregar o `AsyncStorage`.
- O seletor Claro/Escuro em Configurações e o toggle no Perfil continuam
  usando `setMode`/`toggle`.
- Default escuro já é o comportamento atual; o teste protege a regra.

## Acessibilidade

- Modal com `onRequestClose` (botão físico/voltar).
- Botões com `accessibilityRole="button"` e labels explícitos.
- Loading no botão Sair com `accessibilityState={{ busy: signingOut }}`.
- Foco inicial no modal é responsabilidade do `Modal` nativo; não bloquear
  leitores de tela com conteúdo de fundo interativo.

## Testes

- `theme-mode.test.ts`: default escuro, `'light'`, `'dark'` e valor inválido.
- `typecheck`, `lint`, `test` e `expo export` no mobile.
- Verificação manual: abrir modal, cancelar, confirmar, conferir Visitante;
  alternar tema, fechar/reabrir o app e conferir persistência.

## Critérios de aceite

- Tocar em Sair abre o modal com o texto exato pedido.
- Cancelar mantém o usuário logado.
- Confirmar encerra a sessão e o Perfil mostra **Visitante**, sem ir para o
  sign-in.
- O tema inicia em Escuro e alterna para Claro, persistindo entre sessões.
