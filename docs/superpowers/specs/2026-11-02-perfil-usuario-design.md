# Perfil do Usuário — Design (Abordagem B: Híbrido)

## Intent

Permitir que o usuário edite seus dados ("Meus dados") e que favoritos
sincronizem entre aparelhos, sem duplicar a identidade que o Clerk já
gerencia.

## Escopo

- **In scope:** edição de perfil (nome, telefone, foto), sincronização de
  favoritos entre aparelhos via backend, campo `ownedCompanyIds` reservado
  para "Minha empresa" futuro, endpoint `PUT /me`.
- **Out of scope:** tema sincronizado (fica local), avaliações, multi-cidade.

## Modelo de dados

### Backend (espelho `UserModel`) — adicionar campos

```ts
favorites: { type: [String], default: [] }   // ids de Company
ownedCompanyIds: { type: [String], default: [] }  // reservado
preferences: {
  notifications: { type: Boolean, default: true }
}
```

Campos existentes mantidos: `clerkId`, `firstName`, `lastName`, `email`,
`phone`, `imageUrl`, `role`, `lastSid`, `lastSignInAt`.

### Shared domain (`shared/domain.ts` e cópias)

Adicionar ao tipo `User`:
```ts
favorites?: string[];
ownedCompanyIds?: string[];
preferences?: { notifications: boolean };
```

### Mobile (FavoritesProvider)

- Quando logado (`state === 'signedIn'`): ler favoritos do `/me`, mesclar
  com AsyncStorage local (união, sem duplicatas), persistir no backend.
- Quando convidado: comportamento atual (AsyncStorage apenas).
- Ao favoritar/desfavoritar logado: atualizar AsyncStorage + `PUT /me`.

## API

- `GET /me` (já existe) — retorna o espelho incluindo `favorites`.
- `PUT /me` (novo) — atualiza `firstName`, `lastName`, `phone`,
  `imageUrl`, `favorites`, `preferences.notifications`. Validação via zod.
- Ao upsert do webhook Clerk, preservar `favorites`/`ownedCompanyIds`/
  `preferences` (não sobrescrever).

## "Meus dados" (tela)

- Campos editáveis: Nome, Sobrenome, Telefone, Foto (URL ou upload).
- E-mail read-only (fonte: Clerk).
- Botão "Salvar" → `PUT /me` + `user.update()` no Clerk para nome/foto.
- Feedback de sucesso/erro via Alert.

## Constraints

- TypeScript strict, sem `any`.
- Sem `console.log`.
- Backend tests com supertest contra `app.ts`.
- Mobile: lint + typecheck verdes.

## Approaches considerados

1. **Só Clerk (sem backend)** — editar perfil via Clerk, favoritos continuam
   locais. Simples, mas não sincroniza favoritos. Descartado (usuário quer B).
2. **Híbrido (escolhido)** — Clerk para identidade, backend para favoritos e
   preferências. Balanceado.
3. **Perfil completo** — adiar (P2/P3).

## O que fica para o builder decidir

- Upload de foto vs. URL (recomendo URL por simplicidade no MVP).
- Merge strategy de favoritos (união local+remoto, sem deletar remoto).
- Debounce do PUT /me (recomendo no "Salvar", não a cada toggle).