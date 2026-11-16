# Design — Login como convidado no backend

Data: 2026-11-01 · Status: aprovado

## Intenção e porquê

Hoje o backend já trata requisição **sem** `Authorization` como convidado
(`optionalAuth` monta `req.auth = { guest: true }`) e redige contato de empresa
e código de cupom via `guestScrub()`. O mobile, porém, entra como convidado
apenas no estado local (`enterAsGuest()`), sem nenhum handshake com a API e
sem endpoint explícito para isso.

Este incremento adiciona ao backend a opção explícita de "entrar como
convidado", para que clientes tenham um ponto de entrada claro no fluxo de
autenticação, sem criar um segundo sistema de sessão.

## Goals

- Expor `POST /api/auth/guest` com resposta `200 { "guest": true }`.
- Não criar token, cookie, sessão persistida ou registro no Mongo.
- Manter intacto o comportamento atual de autorização/redação: convidado
  continua sendo quem faz requisições sem `Authorization`.
- Seguir o padrão já existente do `/me`: rota só existe quando o Clerk está
  configurado.

## Non-goals

- Alterar o mobile para chamar o endpoint nesta fase.
- Emitir token de convidado, sessão assinada ou expiração.
- Persistir convidado no Mongo ou rastrear histórico de navegação.
- Mudar o scrub, o `optionalAuth`, o webhook ou o mirror de usuários.
- Proteger rotas de escrita (lacuna já registrada no spec de auth).

## Decisões aprovadas

1. **Endpoint explícito sem token.** A rota é apenas um handshake; as
   requisições seguintes de convidado continuam sem `Authorization`.
2. **Modo legado sem rota.** Sem `CLERK_SECRET_KEY`, a rota não é montada e
   responde 404, igual ao `/me`. Motivo: no modo legado não há noção de
   convidado nem scrub; prometer esse modo seria enganoso.
3. **Resposta mínima `{ guest: true }`.** As restrições de dados continuam
   vivendo no scrub, não duplicadas no contrato.

## Contrato

```
POST /api/auth/guest
Authorization: (nenhum)
Body: (nenhum)

200 OK
Content-Type: application/json

{ "guest": true }
```

- Sem validação de body: a rota não lê payload.
- Se `Authorization` inválido for enviado, `optionalAuth` responde 401 antes
  do handler — token quebrado nunca é rebaixado silenciosamente a convidado.
- Se `Authorization` válido for enviado, a rota ainda responde
  `{ guest: true }`: o endpoint declara a intenção de navegar como convidado.
- Não há 201: nenhum recurso é criado.

## Arquitetura

### Novos arquivos

- `backend/src/controllers/auth.controller.ts` — exporta `guestLogin`, um
  `RequestHandler` sem dependências que responde `{ guest: true }`.
- `backend/src/controllers/auth.controller.test.ts` — teste unitário do
  handler.

### Arquivos alterados

- `backend/src/routes/index.ts` — dentro do bloco `if (authDeps)`, depois de
  `optionalAuth` e `guestScrub()`, monta `routes.post('/auth/guest', guestLogin)`.
- `backend/src/routes/auth.guest.test.ts` — integração da rota nos dois modos
  (Clerk configurado e legado).

Nenhum tipo de domínio muda, então não há propagação para `shared/` nem para
as cópias de mobile/admin.

## Fluxo

1. Cliente envia `POST /api/auth/guest` sem token.
2. `optionalAuth` marca `req.auth = { guest: true }` e chama `next()`.
3. `guestScrub()` instala o interceptor de resposta.
4. `guestLogin` responde `{ guest: true }`; o interceptor não encontra campos
   sensíveis e devolve o payload intacto.
5. Nas chamadas seguintes, o cliente continua sem `Authorization` e recebe os
   dados redigidos pelo scrub.

## Testes (TDD)

1. **Controller unitário** — `guestLogin` responde 200 com `{ guest: true }`,
   sem depender de `req.auth`.
2. **Integração com Clerk configurado** — env stubada (`CLERK_SECRET_KEY` e
   `CLERK_PUBLISHABLE_KEY`), `vi.resetModules()` e import dinâmico de `app.ts`;
   `POST /api/auth/guest` responde 200 `{ guest: true }`.
3. **Integração no modo legado** — env de Clerk vazia + import dinâmico;
   `POST /api/auth/guest` responde 404 (rota não montada).
4. **Gate** — `npm run lint`, `npm run typecheck` e `npm test` dentro de
   `backend/`.

## Riscos e observações

- O teste de integração depende da criação do cliente Clerk com chaves fake;
  se a lib validar o formato, usar placeholders em formato válido e mockar
  apenas a dependência externa (AGENTS §2).
- A rota não autentica nada por si só; ela apenas formaliza a intenção. A
  segurança real continua no `optionalAuth` e no scrub.
- Alterar o mobile para chamar o endpoint fica como próximo passo opcional,
  fora deste escopo.
