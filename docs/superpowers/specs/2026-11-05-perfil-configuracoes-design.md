# Perfil & Configurações — Design

## Intent

Refinar a aba **Perfil** para que ela comunique corretamente a diferença entre
**Visitante** (modo convidado) e **Usuário autenticado**, mantendo as telas
secundárias já existentes ("Meus dados", "Minha empresa", "Configurações" e
"Sair"). O header passa a incentivar o login para convidados e a exibir
identidade e status para usuários logados.

A tela **Meus Dados** deixa de ser um modal e vira uma rota própria
(`UserProfileScreen`), com edição de nome, telefone e bairro.

## Escopo

- **In scope:**
  - Header dinâmico (visitante/logado) da aba Perfil.
  - Banner e CTA de login para convidados.
  - Tag de status `Cidadão` / `Empresa Parceira` para logados.
  - Comportamento dos itens do menu existente, respeitando o estado de auth.
  - Tela `UserProfileScreen` com Nome, Sobrenome, E-mail, Telefone/WhatsApp,
    Bairro e botão `[ Salvar Alterações ]`.
  - Novo campo `User.neighborhood` (backend, shared e cópias).
  - Extração da feature para `mobile/src/features/profile/`, mantendo a rota
    `src/app/(tabs)/profile.tsx` fina.
- **Out of scope:**
  - Novas telas no menu além de "Meus dados".
  - Upload/edição de foto de perfil.
  - Entidade ou endpoint de bairros.
  - Refatorar `my-company.tsx` ou `settings-screen.tsx` além do necessário.
  - Sincronização de tema ou exclusão de conta.

## Decisões

| Tema | Decisão |
| --- | --- |
| Origem da tag | Posse real de empresa: `GET /companies?owner=<clerkId>` (filtro já suportado). |
| Tag desconhecida | Ocultar o chip enquanto carrega ou se a consulta falhar (não afirmar status sem dado). |
| CTA do visitante | `[ Entrar ou Cadastrar ]` → `/(auth)/sign-in`; a tela existente já alterna entre entrar e criar conta. |
| "Sair" para visitante | Substituído por `Entrar ou cadastrar` no menu; `Sair` aparece apenas para logado. |
| Acesso ao Clerk | `AuthProvider` expõe `updateProfileName`; a tela não usa `useUser` diretamente. No modo dev sem chave do Clerk, a função é no-op. |
| E-mail | Sempre somente leitura (fonte: Clerk). |
| Nome | Dois campos (Nome e Sobrenome), mantendo `firstName`/`lastName` do Clerk e do backend. |
| Telefone/WhatsApp | Um único campo `phone`, com o rótulo "Telefone / WhatsApp". |
| Bairro | Texto livre persistido em `User.neighborhood`; sem lista fixa ou entidade nova. |

## Arquitetura

```
mobile/src/
  app/(tabs)/profile.tsx          → rota fina da aba
  app/user-profile.tsx            → rota fina da tela Meus Dados
  features/profile/
    profile-screen.tsx            → orquestra estado e ações da aba
    profile-header.tsx            → header visitante/logado + tag
    user-profile-screen.tsx       → formulário "Meus Dados"
    account-tag.ts                → função pura da tag
    use-profile.ts                → /me + empresas do usuário
  services/api.ts                 → getOwnedCompanies(clerkId)
  providers/auth-provider.tsx     → updateProfileName

shared/domain.ts                  → User.neighborhood
mobile/src/types/domain.ts        → cópia sincronizada
admin/src/types/domain.ts         → cópia sincronizada

backend/src/
  models/user.model.ts            → campo neighborhood
  types/dto.ts                    → updateUserSchema.neighborhood
```

- A rota não contém markup nem regra de negócio.
- `account-tag.ts` concentra a regra observável: `0` empresas → `Cidadão`;
  `>= 1` → `Empresa Parceira`; desconhecido (`null`) → sem tag.
- `use-profile.ts` encapsula I/O e cancelamento (`cancelled`) no unmount.
- `UserProfileScreen` é acessível apenas para `state === 'signedIn'`.

## Fluxos

### Visitante (`state === 'guest'`)

1. Header com avatar padrão e nome **Visitante**.
2. Card em `Overlays.amberGlow` com o texto:
   > Faça login para salvar favoritos, receber alertas comunitários ou
   > cadastrar seu negócio.
3. Botão primário amarelo/dourado `[ Entrar ou Cadastrar ]` → sign-in.
4. Menu:
   - `Meus dados` → sign-in.
   - `Minha empresa` → sign-in.
   - `Configurações` → `/settings`.
   - `Entrar ou cadastrar` → sign-in (não há `Sair`).

### Logado (`state === 'signedIn'`)

1. Avatar (foto ou ícone padrão), nome completo (fallback: e-mail) e e-mail.
2. Chip de status:
   - `Empresa Parceira` se `getOwnedCompanies` retornar ao menos uma empresa.
   - `Cidadão` se retornar lista vazia.
   - Oculto enquanto carrega ou em erro.
3. Menu:
   - `Meus dados` → `/user-profile`.
   - `Minha empresa` → `/my-company`.
   - `Configurações` → `/settings`.
   - `Sair` → `signOut()`; o guard das abas redireciona para o sign-in.

### Carregando (`state === 'loading'`)

Indicador de carregamento central; não renderizar "Visitante" antes de saber o
estado real.

### Sem sessão (`state === 'signedOut'`)

O guard de `(tabs)` já redireciona para o sign-in; a tela não precisa tratar
esse estado além de não disparar chamadas autenticadas.

## `UserProfileScreen` ("Meus Dados")

- Rota `/user-profile`, aberta apenas a partir do menu de um usuário logado.
- Guard próprio: `state !== 'signedIn'` → `router.replace('/(auth)/sign-in')`.
- Campos:
  - Nome (`firstName`).
  - Sobrenome (`lastName`).
  - E-mail somente leitura (Clerk).
  - Telefone / WhatsApp (`phone`, formatado com `formatPhone`/`onlyDigits`).
  - Bairro de residência (`neighborhood`, texto livre).
  - Botão `[ Salvar Alterações ]`.
- Carregamento inicial via `getMe()`; enquanto carrega, mostra indicador.
- Salvar:
  1. `updateMe({ firstName, lastName, phone, neighborhood })`.
  2. `updateProfileName(firstName, lastName)` (Clerk) quando logado.
  3. Alert de sucesso/erro; em falha, mantém os valores atuais.
- Guest nunca abre a tela e nunca dispara `PUT /me`.

## Backend — campo `neighborhood`

- `shared/domain.ts`: `neighborhood?: string` em `User`.
- `mobile/src/types/domain.ts` e `admin/src/types/domain.ts`: replicar o campo.
- `backend/src/models/user.model.ts`: `neighborhood: { type: String, trim: true }`.
- `backend/src/types/dto.ts`: `neighborhood: z.string().trim().max(120).optional()`
  em `updateUserSchema`; string vazia limpa o campo.
- `PUT /me` já persiste campos do DTO via `updateUserByClerkId`; nenhuma rota
  nova é necessária.

## Dados e erros

- `getOwnedCompanies(clerkId)` chama `/companies?owner=<clerkId>&pageSize=1`.
  Sem API configurada, filtra os mocks por `ownerClerkId` (resultado vazio).
- `/me` e a consulta de posse são _best-effort_: falha mantém os dados do
  Clerk e oculta a tag.
- `getMe` continua retornando `null` em falha, sem quebrar a tela.
- Não logar PII; sem `console.log` no código entregue.

## Acessibilidade

- Avatar/botão do header com `accessibilityRole="button"` e label descritivo.
- CTA de login com label `Entrar ou cadastrar`.
- Chip de status com `accessibilityLabel` contendo o status.
- Itens de menu com `accessibilityRole="button"` e labels explícitos.
- Campos do formulário com `accessibilityLabel` e `textContentType` adequados.

## Testes

- TDD para `account-tag.ts`:
  - lista vazia → `Cidadão`;
  - uma ou mais empresas → `Empresa Parceira`;
  - desconhecido (`null`) → `null`.
- TDD para o DTO: `neighborhood` aceito e limitado a 120 caracteres.
- Backend: teste de integração de `PUT /me` persistindo `neighborhood`.
- Verificação estática: `npm run typecheck` e `npx expo lint`.
- Testes: `npm test` em `backend/` e `mobile/`.
- Verificação manual: visitante → login → perfil logado → Meus Dados →
  salvar bairro → reabrir a tela e conferir o valor.

## Critérios de aceite

- Convidado vê "Visitante", banner e CTA dourado; não vê "Sair".
- Logado vê nome, e-mail e tag correta; "Sair" encerra a sessão.
- "Meus dados" abre a tela `/user-profile` apenas logado.
- A tela exibe e-mail read-only e salva nome, telefone e bairro em `/me`.
- Bairro persiste entre sessões após recarregar o perfil.
- Nenhuma chamada autenticada parte do modo convidado.
- Lint, typecheck e testes verdes nos apps afetados.
