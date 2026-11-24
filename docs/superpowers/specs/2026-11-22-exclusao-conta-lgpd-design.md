# Exclusão Definitiva de Conta (LGPD) — Design

Data: 2026-11-22
Status: Aprovado para implementação
Escopo: backend (novo endpoint self-service + service compartilhado) e mobile (zona de perigo + modal). Admin não muda de UI; só herda a limpeza de notificações no service compartilhado.

---

## 1. Contexto e objetivo

A LGPD (Lei nº 13.709/2018, Art. 18, VI) garante ao titular o direito à eliminação dos dados pessoais tratados. Hoje o painel admin já consegue excluir um usuário (`DELETE /users/:id`), mas o próprio usuário não tem nenhuma forma de pedir a exclusão pelo app.

Este design adiciona um fluxo **self-service, autenticado e irreversível** para o usuário logado:

1. Entrada visível em **Perfil → Privacidade e Segurança → Excluir minha conta**.
2. Modal de confirmação com aviso de irreversibilidade e trava explícita (digitar `EXCLUIR`).
3. Chamada autenticada ao backend, remoção dos dados pessoais no Mongo, exclusão do usuário no Clerk e limpeza local no dispositivo.
4. Logout automático com feedback de sucesso.

**Decisões aprovadas no brainstorm:**

- Ponto de entrada: **tela de Perfil**.
- Modal **sempre escuro**, fiel à identidade visual do spec, com tokens novos no `theme.ts` (sem cores literais no componente).
- Trava: **digitar `EXCLUIR`** (sem reautenticação por senha).
- Dados vinculados: **apagar tudo** — perfil, favoritos, notificações, push tokens, avaliações, empresas e profissionais autônomos do usuário.
- Auditoria: **log estruturado no servidor**, sem PII e sem nova coleção.
- Pós-exclusão: **Home como convidado**.

**Relação com o fluxo admin existente:** o service de limpeza passa a ser compartilhado, corrigindo a lacuna de notificações in-app na exclusão administrativa. O endpoint admin continua com o mesmo contrato e a mesma defesa de self (admin não exclui a própria conta por essa rota).

## 2. Backend

### 2.1 Endpoint

Nova rota em `backend/src/routes/index.ts`, **dentro do bloco `authDeps`** (junto de `GET /me` e `PUT /me`):

| Método   | Rota        | Autorização        | Resposta |
| -------- | ----------- | ------------------ | -------- |
| `DELETE` | `/api/me`   | `auth.requireAuth` | `204` sem corpo |

- Sem Clerk configurado (modo legado), a rota **não é montada** → `404`, consistente com `/me`.
- Com Clerk configurado e sem sessão → `401` pelo middleware.
- Com sessão válida → executa a exclusão do `req.auth.clerkId`.
- Erro de exclusão no Clerk → `502` com mensagem genérica, sem detalhes internos.

**Controller:** `makeDeleteMeController` em `backend/src/controllers/user.controller.ts`, com dependência injetável (`remove: deleteOwnAccount`) para teste sem Mongo/Clerk. O handler lê apenas `req.auth?.clerkId`; a ausência de identidade já foi barrada pelo `requireAuth`.

### 2.2 Service

Refatorar `backend/src/services/user.service.ts` para separar responsabilidades:

```ts
interface RemovedAccountData {
  user: boolean;
  pushTokens: number;
  reviews: number;
  companies: number;
  autonomousProfessionals: number;
  notifications: number;
}

removeLocalUserData(clerkId: string): Promise<RemovedAccountData>
deleteClerkUser(clerkId: string): Promise<void>
deleteUser(id: string): Promise<User | null>          // admin, contrato atual
deleteOwnAccount(clerkId: string): Promise<RemovedAccountData> // self-service
```

**`removeLocalUserData(clerkId)`** remove, em sequência:

- `NotificationModel.deleteMany({ clerkId })` — **novo**, fecha a lacuna atual.
- `PushTokenModel.deleteMany({ clerkId })`.
- `ReviewModel.deleteMany({ clerkId })`.
- `CompanyModel.deleteMany({ ownerClerkId: clerkId })`.
- `AutonomousProfessionalModel.deleteMany({ ownerClerkId: clerkId })`.
- `UserModel.deleteOne({ clerkId })` — o documento contém favoritos, preferências, push token e vínculos.

Cada limpeza é **best-effort** (falha é logada e não interrompe as demais), preservando o comportamento atual do admin. Retorna as contagens para a auditoria.

**`deleteOwnAccount(clerkId)`**:

1. Chama `removeLocalUserData(clerkId)`.
2. Chama `deleteClerkUser(clerkId)`.
3. Se o Clerk falhar, lança erro com `statusCode: 502` e mensagem genérica (`'Não foi possível encerrar a conta no provedor de autenticação'`). O retry é idempotente: o usuário local já não existe, mas a exclusão no Clerk é tentada novamente.
4. Em sucesso, retorna as contagens para o log de auditoria.

**Trade-off explícito:** a limpeza local acontece antes da exclusão no Clerk. Se o Clerk falhar, os dados locais já foram removidos, mas a credencial pode continuar ativa no provedor; o `502` informa o usuário e o retry resolve. A ordem inversa deixaria PII no Mongo com a credencial já apagada, o que é pior para a LGPD.

**Admin:** `deleteUser(id)` continua retornando o usuário removido e chama `removeLocalUserData(user.clerkId)`; a exclusão no Clerk permanece best-effort para não alterar o contrato existente. O fluxo admin também passa a emitir o mesmo log anônimo de auditoria.

### 2.3 Auditoria sem PII

Novo `backend/src/utils/audit.ts`:

```ts
export interface AccountDeletionAudit {
  event: 'account_deleted';
  at: string; // ISO 8601
  removed: RemovedAccountData;
}

export function buildAccountDeletionAudit(
  removed: RemovedAccountData,
  now: Date = new Date(),
): AccountDeletionAudit;

export function logAccountDeletion(removed: RemovedAccountData): void;
```

`logAccountDeletion` emite **uma linha JSON** via `console.info` (auditoria deliberada, não debug). O payload contém apenas evento, timestamp e contagens. **Nunca** entram `clerkId`, e-mail, nome, telefone, token, IP ou qualquer identificador.

### 2.4 Erros

- `401` — sem sessão (middleware).
- `502` — falha ao excluir no Clerk.
- `500` — falha inesperada na limpeza local (o `errorHandler` não vaza detalhes em produção).
- A resposta de erro não inclui stack, caminho interno ou PII.

## 3. Mobile

### 3.1 Entrada na tela de Perfil

Em `mobile/src/app/(tabs)/profile.tsx`, abaixo do menu e acima do toggle de tema, renderizar uma seção **“Privacidade e Segurança”** somente quando `state === 'signedIn'`.

Novo componente `mobile/src/features/profile/danger-zone.tsx`:

- Título da seção com `Typography.label`/`h5` conforme o padrão da tela.
- Card com borda e ícone de lixeira em `colors.error`.
- Linha “Excluir minha conta” com subtítulo “Apaga permanentemente sua conta e seus dados (LGPD)”.
- `accessibilityRole="button"`, `accessibilityLabel="Excluir minha conta permanentemente"`.
- `onPress` abre o modal.

A seção não aparece para convidado, deslogado ou durante `loading`. O menu (`buildMenu`) não muda; a ação destrutiva fica visualmente separada do menu comum.

### 3.2 Modal `DeleteAccountModal`

Novo `mobile/src/features/profile/delete-account-modal.tsx`, no padrão do `SignOutModal` (Modal transparente, `animationType="fade"`, `Pressable` de backdrop).

Props:

```ts
interface DeleteAccountModalProps {
  visible: boolean;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}
```

Comportamento:

- Input controlado localmente; `autoCapitalize="characters"`, `autoCorrect={false}`, placeholder `EXCLUIR`.
- Botão destrutivo desabilitado enquanto `podeConfirmarExclusao(texto)` for falso ou `deleting` for verdadeiro.
- `ActivityIndicator` dentro do botão durante `deleting`.
- Erro exibido acima dos botões, sem fechar o modal.
- Backdrop e botão Cancelar ficam inativos durante `deleting`.
- Ao fechar/cancelar, o texto é limpo.
- Acessibilidade: `accessibilityViewIsModal`, labels nos botões, `accessibilityState={{ busy: deleting, disabled } }`.

**Trava de confirmação:** helper puro `mobile/src/features/profile/delete-account.ts`:

```ts
export function podeConfirmarExclusao(texto: string): boolean {
  return texto.trim().toUpperCase() === 'EXCLUIR';
}
```

Aceita minúsculas/espaços nas bordas por usabilidade; a palavra precisa ser exatamente `EXCLUIR` após normalização.

### 3.3 Design tokens (sempre escuro)

Adicionar ao `mobile/src/constants/theme.ts` um bloco `DangerModalColors` (nomes semânticos, sem literais no componente):

| Token | Valor |
| ----- | ----- |
| `backdrop` | `rgba(0, 0, 0, 0.75)` |
| `surface` | `#1E1E1E` |
| `border` | `#27272A` |
| `iconBackground` | `rgba(239, 68, 68, 0.15)` |
| `icon` | `#EF4444` |
| `title` | `#FFFFFF` |
| `body` | `#A1A1AA` |
| `inputBackground` | `#121212` |
| `inputBorder` | `#3F3F46` |
| `inputBorderFocused` | `#EF4444` |
| `inputText` | `#FFFFFF` |
| `inputPlaceholder` | `#71717A` |
| `cancelBackground` | `#27272A` |
| `cancelText` | `#E4E4E7` |
| `destructive` | `#EF4444` |
| `destructivePressed` | `#DC2626` |
| `destructiveDisabled` | `rgba(239, 68, 68, 0.25)` |
| `destructiveDisabledText` | `rgba(255, 255, 255, 0.4)` |

Adicionar também `Radius.modalAction = 10` (o spec pede 10; os tokens existentes não têm esse valor).

**Tipografia:** título em `Typography.h3` (Rubik 18/24, peso 700); corpo em primitivos Inter 400 com `Type.sm` (14/20). Sem `fontSize`/`fontWeight` crus fora do theme, respeitando o gate de tipografia (§6.3 do AGENTS.md).

**Ícone:** `Ionicons` `trash-outline` (família já usada no app) centralizado em círculo de 48–56dp com `iconBackground`.

### 3.4 HTTP e API

**`mobile/src/services/http.ts`:** adicionar `requestOrThrow<T>(path, init)`.

- Mesma resolução de base URL, token e retry de `401` do `request`.
- Sem base URL configurada, lança erro explícito (nunca devolve `null` silencioso).
- Lança `ApiError` para `401`/`403` e demais respostas não-OK.
- Lança erro de rede quando o `fetch` falha (em vez de devolver `null`).
- Devolve `null` para `204`/corpo não-JSON, como o `request` atual.
- `request` existente passa a delegar para `requestOrThrow` e mantém o fallback para `null` em erros não-`ApiError`, preservando o comportamento de todos os chamadores.

**`mobile/src/services/api.ts`:**

```ts
export async function deleteAccount(): Promise<void> {
  await requestOrThrow('/me', { method: 'DELETE' });
}
```

Sem fallback mock: se a API não estiver configurada, `requestOrThrow` lança erro e o modal exibe falha. Nunca fingir que a conta foi excluída.

### 3.5 Armazenamento local

Centralizar as chaves em `mobile/src/constants/storage-keys.ts`:

```ts
export const GUEST_STORAGE_KEY = 'guia:guest';
export const FAVORITES_STORAGE_KEY_BASE = '@guia-comercial/favorites';
export function favoritesStorageKey(clerkId?: string): string;
```

Atualizar `auth-provider.tsx` e `favorites-provider.tsx` para importar daqui (sem mudar o comportamento).

Novo helper `clearLocalAccountData(clerkId?: string)` em `features/profile/delete-account.ts`:

- Remove `GUEST_STORAGE_KEY`.
- Remove `favoritesStorageKey(clerkId)`.
- Não remove a preferência de tema (`guia.theme.mode`) — não é dado pessoal e melhora a experiência do convidado.
- A sessão do Clerk (SecureStore) é encerrada pelo `signOut`; o servidor já invalidou o usuário.

### 3.6 Fluxo pós-exclusão

Em `profile.tsx`:

1. `onConfirm` chama `deleteAccount()`.
2. Em sucesso:
   - `await clearLocalAccountData(user?.clerkId)`.
   - `await completeAccountDeletion()` no `AuthProvider` (novo método): marca estado local como convidado, persiste `guia:guest=1` e chama o `signOut` do Clerk em `try/catch` (a sessão já foi invalidada no servidor).
   - `router.replace('/(tabs)')`.
   - `Alert.alert('Conta excluída', 'Sua conta e seus dados foram excluídos com sucesso.')`.
3. Em erro:
   - O modal permanece aberto.
   - `ApiError` `401/403` → “Sua sessão expirou. Entre novamente e tente de novo.”
   - Erro de rede → “Não foi possível conectar. Verifique sua internet e tente novamente.”
   - `502` → “Não foi possível encerrar sua conta no provedor de autenticação. Tente novamente ou fale com o suporte.”
   - Demais → “Não foi possível excluir sua conta. Tente novamente.”

O `AuthProvider` ganha `completeAccountDeletion: () => Promise<void>` no `AuthState`. No modo dev sem Clerk (fallback), o método apenas limpa o estado local.

## 4. Testes e verificação

### Backend (TDD — teste falhando antes)

- **Rota `DELETE /api/me`** (supertest contra `app.ts`, modelos em memória):
  - `401` sem sessão.
  - `204` com sessão.
  - Remove o `User` do `clerkId` autenticado.
  - Remove `Notification`, `PushToken`, `Review`, `Company` e `AutonomousProfessional` vinculados.
  - Não remove dados de outro usuário.
  - Chama `client.users.deleteUser(clerkId)` no Clerk.
  - Falha do Clerk → `502` e corpo sem detalhes internos.
  - Log de auditoria emitido sem `clerkId`, e-mail ou nome.
- **Service:** `buildAccountDeletionAudit` é puro e retorna apenas evento, timestamp e contagens; `logAccountDeletion` emite JSON válido.
- **Admin:** regressão de `DELETE /users/:id` continua funcionando e agora remove notificações.
- **Test-support:** adicionar `deleteMany` ao `backend/src/test-support/memory-model.ts` (usado só nos testes).

### Mobile (funções puras)

- `podeConfirmarExclusao`: aceita `EXCLUIR`, ` excluir `, rejeita vazio, `EXCLUIR!`, `EXCLUIR ` com outras palavras.
- `favoritesStorageKey`: chave estável por `clerkId` e fallback `guest`.
- `requestOrThrow`: `204` resolve, `401/403` lança `ApiError`, falha de rede lança erro, resposta OK com JSON resolve normalmente.
- `deleteAccount`: chama `DELETE /me` e propaga erro (sem cair em mock).

### Gates

O diff toca **backend + mobile** (dois apps), então rodar o gate completo dos três:

- **backend:** `npm run lint`, `npm run typecheck`, `npm test`.
- **mobile:** `npx expo lint`, `npm run typecheck`, `npm test`, gate de tipografia (`fontSize:\s*\d` e `fontWeight: '[0-9]+'` crus fora de `src/constants/theme.ts`).
- **admin:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (sem mudança funcional, mas exigido pela regra de dois apps).

### Verificação manual

1. Logar com usuário de teste.
2. Perfil → Excluir minha conta.
3. Confirmar que o botão só habilita com `EXCLUIR`.
4. Excluir e conferir: Home como convidado, Alert de sucesso, usuário ausente no Mongo, notificações/reviews/tokens/empresas removidos e usuário ausente no Clerk.
5. Repetir com falha simulada de rede: modal permanece aberto com mensagem clara.

## 5. Fora de escopo

- Reautenticação por senha/código (a trava é digitar `EXCLUIR`).
- Exclusão de campanhas de push criadas por admin (`createdByClerkId`) — não são dados pessoais do titular comum.
- Anonimização de avaliações (decisão: apagar).
- Preservação de empresas removendo apenas o vínculo do dono (decisão: apagar).
- Cron/rotina de retry automático para falha de exclusão no Clerk (o usuário pode tentar de novo; o log registra a falha).
- UI de exclusão no painel admin (já existe).
- Alteração do `shared/domain.ts` (nenhum tipo novo é necessário).

## 6. Riscos e observações

- **Atomicidade:** Mongo e Clerk não compartilham transação. A ordem escolhida (local → Clerk) prioriza a remoção da PII local; falha no Clerk vira `502` e retry idempotente.
- **Sessão local:** se o `signOut` do Clerk falhar após a exclusão, o app força o estado de convidado; o token remanescente é inválido no servidor. O usuário não recupera a conta.
- **Modo dev sem Clerk:** o app usa usuário fake; o botão aparece, mas `DELETE /me` não existe/falha. A mensagem de erro orienta; não há exclusão real nesse modo.
- **Auditoria em log:** a retenção depende da infraestrutura de logs. Se for necessária prova durável, evoluir para coleção anônima em um próximo ciclo.
- **Favoritos locais:** a chave de favoritos é removida pelo `clerkId` no momento da exclusão. Se o `clerkId` não estiver disponível, a chave de convidado não é afetada.
