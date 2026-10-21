# AGENTS.md — Guia Comercial

Regras operacionais para agentes de código que trabalham neste monorepo.
**Leia antes de editar qualquer arquivo.** Se uma regra conflitar com o pedido
do usuário, a regra do usuário vence — mas avise o conflito em uma frase.

Este repo é um **monorepo com três apps independentes** (mobile, backend, admin)
mais um diretório `shared/` com tipos de domínio.

---

## 0. Não-negociáveis

1. **Nunca commite segredos.** `.env`, chaves, tokens e URLs privadas ficam em
   `.env` (ignorado) — só `.env.example` vai para o git. Nenhum segredo no
   código-fonte, em mocks, em logs ou em mensagens de erro.
2. **Nunca instale dependências na raiz.** Cada app tem o próprio
   `package.json` e `package-lock.json`. Sem workspaces npm neste repo.
3. **Nunca crie/edite `ios/` ou `android/`** — não existem (Continuous Native
   Generation). Configure comportamento nativo em `app.json` e config plugins.
4. **Nunca declare "pronto" sem verificar.** Rodar lint/typecheck/testes não é
   opcional; um diff plausível não é prova. Se não rodou, diga que não rodou.
5. **Não altere arquivos fora do escopo do pedido.** Refactor "por passar" é
   ruído em review. Se encontrar código morto, mention no resumo — não apague
   sozinho.
6. **Não faça force-push em `master`/`main`** e não sobrescreva histórico.
7. **Se não conseguir seguir uma regra, pare e diga qual é.** Não contorne.
8. **Não use `bunx`/`pnpm` neste repo** — os três apps usam npm (há
   `package-lock.json`). Use `npx`.

---

## 1. Monorepo: regras estruturais

### Fronteiras entre apps

| App        | Pode importar de                        | Proibido                                                        |
| ---------- | --------------------------------------- | --------------------------------------------------------------- |
| `backend/` | `shared/domain.ts` (só tipos), `src/**` | UI, libs do mobile/admin                                        |
| `mobile/`  | `src/**`, `src/types/domain.ts`         | backend, admin, `shared/` (import cross-project quebra o Metro) |
| `admin/`   | `src/**`, `src/types/domain.ts`         | backend, mobile, `shared/`                                      |

- **Dependências apontam para dentro**: `routes → controllers → services → models`.
  Uma camada nunca chama a de cima; models não conhecem HTTP.
- **Tipos de domínio têm dono**: `shared/domain.ts` é a fonte da verdade.
  `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` são cópias
  idênticas mantidas porque o Metro e o Vite não resolvem import
  cross-project. **Ao editar `shared/domain.ts`, replique nas cópias no mesmo
  commit.** Regra prática: os três arquivos devem ter os mesmos campos,
  nomes e tipos.
- **Não crie um quarto `package.json` na raiz** e não introduza workspaces sem
  decisão explícita do maintainer.

### Onde rodar cada comando

| Ação                          | Diretório           | Comando                                              |
| ----------------------------- | ------------------- | ---------------------------------------------------- |
| Instalar lib do app           | `mobile/`           | `npx expo install <pkg>` (nunca `npm install <pkg>`) |
| Instalar lib do backend/admin | `backend/` `admin/` | `npm i <pkg>` dentro da pasta                        |
| Lint                          | cada app            | `npm run lint`                                       |
| Typecheck                     | cada app            | `npm run typecheck`                                  |
| Testes                        | `backend/`          | `npm test`                                           |
| Dev server                    | cada app            | `npm run dev` / `npx expo start`                     |

Rodar o gate **de todos os apps** é obrigatório antes de dizer que terminou
(exceto quando o escopo é estritamente de um app — nesse caso, rode o gate
dele e justifique).

---

## 2. TDD — a regra de ouro

**Nenhum código de produção sem um teste falhando antes.**

Ciclo: **RED → GREEN → REFACTOR** (vertical, um comportamento por vez).

1. **RED** — escreva o teste do próximo comportamento. **Rode e veja falhar.**
   Um teste que passa na primeira execução não está testando nada.
2. **GREEN** — escreva o _mínimo_ código que faz passar. Hardcode é aceitável
   aqui; o próximo teste vai te obrigar a generalizar.
3. **REFACTOR** — remova duplicação, renomeie, extraia funções. Sem mudar
   comportamento, sempre com o teste verde.

Regras do projeto:

- **Bug encontrado = primeiro um teste que reproduz o bug** (falha), depois a
  correção. O teste permanece como regressão.
- **Fixe a causa raiz**, não o sintoma. Não deslige o teste que incomoda.
- **Teste de comportamento, não de implementação**: afirme o resultado
  observável (status HTTP, JSON retornado), não a chamada interna.
- **Um comportamento por teste**, nome descritivo ("e" no nome → divida).
- **Sem `setTimeout`/sleep** esperando estado assíncrono; use await de
  promises reais.
- **Mocke o que você não possui** (rede, banco); não mocke o que é seu.
  Política do backend: funções puras (zod, `mapError`, `parsePagination`) são
  testadas sem I/O; endpoints usam supertest contra `app.ts` (nunca `index.ts`,
  que conecta no Mongo).
- **Testes não dependem de ordem** nem de estado compartilhado.
- **Cobertura não é objetivo** — comportamento é. Não escreva teste que só
  exercita linhas.

Pirâmide de testes a seguir no crescimento do projeto: muitos unitários
rápidos, alguns de integração (API), poucos e2e.

---

## 3. Código limpo

- **Nomes explícitos e coerentes com o domínio** (`listCompanies`, `categoryLabel`).
  Código e comentários em **português** neste repositório (exceto identificadores
  de biblioteca). Sem abreviações crípticas, sem `data`, `info`, `temp`.
- **Funções curtas e com uma responsabilidade.** Se precisa de comentário
  "e também", extraia.
- **Guard clauses e retorno antecipado** em vez de `if/else` aninhado.
- **Comentário explica o _porquê_, nunca o _o quê_.** Código óbvio não leva
  comentário. Comment-out de código é proibido (apague).
- **DRY vs DAMP**: duplique duas linhas antes de criar uma abstração para
  um único uso. Abstraia na **terceira** ocorrência, e só se a regra for real.
- **Sem números mágicos**: cores, espaçamentos, radii e tamanhos de fonte vão
  para `mobile/src/constants/theme.ts`; limites de paginação para
  `parsePagination`.
- **Erros**: nunca engolir (`catch {}` vazio sem motivo explícito), sempre
  tipados, sempre com mensagem útil. No backend, erros de domínio carregam
  `statusCode`; no app, `Alert`/`Linking` com fallback.
- **Imutabilidade por padrão**: não mute parâmetros nem estado global; derive
  valores novos.
- **TypeScript estrito**: `strict` ligado. Proibido `any`; use `unknown` +
  narrowing. `import type` para tipos. `verbatimModuleSyntax` no admin.
- **Sem `console.log` sobrando** em código entregue (use logger ou remova).
- **YAGNI**: não crie "extensibilidade futura", flags, abstrações ou
  configuração que ninguém pediu. Se a solução cabe em 50 linhas e você
  escreveu 200, reescreva.

---

## 4. SOLID e padrões de projeto (aplicados a este repo)

### SOLID — como observar aqui

| Princípio                                                | Aplicação neste repo                                             | Exemplo de referência                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| **SRP** — uma responsabilidade                           | Um arquivo = um motivo para mudar                                | `backend/src/services/company.service.ts` só fala de empresas |
| **OCP** — aberto para extensão, fechado para modificação | Novas regras = novos schemas/módulos, não `if` no meio do fluxo  | `backend/src/types/dto.ts` (zod)                              |
| **LSP** — substitutibilidade                             | União `string \| Category` para referência populada/não populada | `mobile/src/types/domain.ts` (`categoryLabel`)                |
| **ISP** — interfaces enxutas                             | DTOs por operação (`create*`/`update*` separados)                | `backend/src/types/dto.ts`                                    |
| **DIP** — depender de abstrações                         | Controller depende de `service`, não de Mongoose                 | `backend/src/controllers/*.ts`                                |

### Padrões em uso (e quando NÃO usar)

- **Service Layer** — regras de negócio entre HTTP e dados. Use quando houver
  regra além de CRUD simples; CRUD puro pode morar no controller.
- **Repository** — acesso a dados isolado. Use quando a query se repetir ou
  o handler crescer; não crie a camada "por arquitetura" em API pequena.
- **DTO / Schema de validação** — zod na borda (entrada) e
  `shared/domain.ts` na saída.
- **Middleware / Chain of Responsibility** — `helmet`, `cors`, `json`,
  `validateBody`, `notFoundHandler`, `errorHandler` (a ordem importa!).
- **Strategy / Adapter** — `mobile/src/services/api.ts` escolhe entre API real
  e mock conforme a env; adapter de `Linking` em `mobile/src/utils/links.ts`.
- **Facade** — `api.ts` (mobile/admin) é a fachada do HTTP para o resto do app.
- **Hook (React)** — `useHomeData`, `useApi` encapsulam estado de rede.
- **Provider/Context** — quando o estado passar a ser compartilhado por várias
  telas (ex.: autenticação), use Context + `useAuth`, não um singletão global.

> Regra anti-padrão: **não introduza um padrão sem um problema concreto já
> observado.** Pattern for the sake of pattern = dívida.

---

## 5. Regras do backend (Express 5 + Mongoose 9)

- **Camadas**: `routes → controllers → services → models`. Controller nunca
  toca em `Model`; model nunca sabe de HTTP.
- **Validação de entrada é obrigatória** e acontece na borda (zod em
  `types/dto.ts`). `POST` valida o schema completo; `PUT` valida `.partial()`.
- **Erros**:
  - `statusCode` customizado nos services → status correspondente.
  - `ValidationError` → 400, `CastError` → 404, chave duplicada (11000) → 409,
    `ZodError` → 400, desconhecido → 500.
  - O `errorHandler` **precisa ter 4 parâmetros** `(err, req, res, next)`;
    com 3 o Express ignora o middleware e devolve HTML. Não "simplifique" a
    assinatura.
  - Em produção, a resposta de erro **não** carrega stack nem mensagem
    interna.
- **Paginação** sempre: `parsePagination` (page ≥ 1, pageSize 1–100) e
  resposta no shape `Paginated<T>` (`items`, `total`, `page`, `pageSize`).
- **Mongo**: `slug` único e indexado; `timestamps`; queries com `select`/`lean`
  quando possível; `populate` só onde o consumidor precisa do objeto.
- **IDs**: valide antes de consultar (`isValidObjectId`) → 404 para id
  malformado, nunca 500.
- **Configuração por env** (`MONGODB_URI`, `PORT`, `CORS_ORIGINS`,
  `NODE_ENV`). Sem valor default silencioso para conexão de banco.
- **Segurança**: `helmet`, `express.json({ limit: '1mb' })`, CORS por
  allowlist, validação de toda entrada (OWASP API3). Ao expor a API
  publicamente, adicione **rate limiting** e **autorização por recurso**
  (OWASP API1/API4) — hoje isso é uma lacuna conhecida.
- **Sem dados de exemplo em produção**; use um script de seed separado.

## 6. Regras do mobile (Expo SDK 58 / RN 0.88)

- `src/app/` = **somente rotas**. Cada arquivo é uma tela; `_layout.tsx`
  define navegadores. Componentes, hooks e utils ficam **fora** de `src/app/`.
- Use **Expo Router** para navegação: `Link`, `router`, `useLocalSearchParams`,
  `useSegments` de `expo-router`. Nada de `react-navigation` direto.
- Componentes de tela em `src/features/<feature>/`; compartilhados em
  `src/components/`.
- **Dados só entram por `src/services/api.ts`.** Componente não faz `fetch`.
  O serviço sempre tem fallback (mock) para o app funcionar sem backend.
- **Tokens centralizados** em `src/constants/theme.ts` (`GuiaColors`,
  `CardColors`, `Overlays`, `Spacing`, `Radius`, `Type`). Cor/sombra/tamanho
  literal fora do theme é dívida.
- **Performance**:
  - Listas longas → `FlashList` (Shopify) ou `FlatList`; nunca `ScrollView`
    com `.map()` para volume alto.
  - `renderItem` estável (`useCallback`), `keyExtractor` por id estável (nunca
    índice), itens de lista com `React.memo`.
  - Estilos via `StyleSheet.create` (sem objeto inline no `render`).
  - `useMemo`/`useCallback` só onde há ganho mensurável — meça antes.
  - `expo-image` para imagens remotas; sempre com `placeholder`/`transition`.
- **Efeitos**: `useEffect` sempre com array de dependências correto e
  _cleanup_ (cancelamento de requisição / flag `cancelled`) para evitar
  `setState` após unmount.
- **Acessibilidade**: `accessibilityLabel`/`role` em elementos clicáveis;
  nunca depender só de cor para comunicar estado.
- **Nunca** deixar `console.log` de debug (o repositório teve esse problema —
  o lint/grep deve passar limpo).
- **Plataforma**: `Platform.select` para diferenças iOS/Android; variantes
  `.web.tsx` só quando a API web for realmente diferente.

## 7. Regras do admin (Vite + React)

- `src/services/api.ts` é a **única** porta de entrada HTTP; erros via
  `ApiError` (status + corpo), nunca `alert()` cru.
- Treat **204/sem corpo** corretamente (não fazer `response.json()`).
- `useApi` guarda o `fetcher` em ref — evita loop de refetch com arrow
  inline.
- Componentes em `src/components/`; `App.tsx` fica fino.
- Endpoint de recurso ainda não implementado **lança erro explícito** —
  nunca finja que funciona.

---

## 8. Git, commits e branches

- **Conventional Commits**:
  `type(scope): descrição` — `feat`, `fix`, `refactor`, `perf`, `test`,
  `docs`, `build`, `chore`, `ci`, `style`. breaking change: `!` após o
  tipo/scope + footer `BREAKING CHANGE: <descrição>`.
  Ex.: `feat(backend): adiciona filtro por categoria em /companies`.
- **Mensagem imperativa e no presente**: "adiciona", não "adicionado".
  Corpo explica o _porquê_; assunto curto (≤ 72 caracteres).
- **Commits atômicos**: uma mudança lógica por commit, cada um reversível
  isoladamente. Não misture refactor + feature + formatação no mesmo commit.
- **Branches**: `feature/<descrição>`, `fix/<descrição>`, `refactor/<descrição>`,
  `chore/<descrição>`. Um tema por branch.
- **Antes de abrir PR**: lint, typecheck e testes verdes nos apps afetados.
- **Trailer de agente** no commit:
  `Generated-by: <agente> (<modelo>)` (ou `Assisted-by:` quando a substância
  foi decidida por uma pessoa).
- **Nunca** force-push em branch protegida; nunca commitar `dist/`, `.env`,
  `node_modules/`.

## 9. Segurança (checklist mínimo)

- Segredos só via env. Nunca no repositório, nem em `.env.example`.
- Toda entrada externa (body, query, params) é **não confiável** → validar.
- Respostas de erro não vazam stack, caminho interno ou segredo.
- CORS por allowlist; `helmet` ativo; limite de payload.
- Dependências: `npm audit` antes de adicionar pacote novo; prefira
  ibliotecas mantidas pelo Expo (`expo install`).
- Antes de expor a API publicamente: rate limiting, autenticação,
  autorização por objeto (OWASP API Top 10 2023: API1, API3, API4, API8).
- Log sem PII desnecessário.

---

## 10. Como trabalhar (fluxo do agente)

1. **Leia antes de escrever**: o arquivo que vai mudar, quem o chama e o
   padrão equivalente mais próximo no repo. O código existente é a melhor
   fonte de padrão.
2. **Plano curto antes da ação**: para tarefa não trivial, liste os passos e
   como cada um será verificado.
3. **Pergunte quando houver dúvida real** sobre requisito ou arquitetura —
   propor alternativa é melhor que assumir. Não pergunte o óbvio.
4. **Um passo por vez**: termine e verifique antes do próximo. Tarefas
   independentes podem ser paralelas (subagentes), mas cada uma com escopo
   próprio e sem sobrepor arquivos.
5. **Verifique, não suponha**: rode lint/typecheck/testes; leia a saída; só
   então reporte. Se falhar, conserte a causa — não o teste.
6. **Se algo não puder ser verificado** (ex.: precisa de device), diga
   explicitamente e descreva como verificar manualmente.
7. **Relatório final**: o que mudou, quais comandos rodaram e o resultado,
   riscos remanescentes e próximos passos sugeridos. Sem enrolação, sem
   "posso fazer mais?".
8. **Não auto-aprovar**: agente não faz merge, não faz release e não publica
   sozinho. Ação externa (push, deploy, PR) só com aprovação explícita.

---

## 11. Expo mudou — não confie na memória

O Expo traz mudanças incompatíveis a cada SDK. Antes de escrever qualquer
código que toque API do Expo, EAS ou React Native:

1. Leia a versão **major** do pacote `expo` em `mobile/package.json`
   (atualmente `~58.0.16`).
2. Baixe a doc versionada: `https://docs.expo.dev/versions/v<major>.0.0/`
3. Para o resto: `https://docs.expo.dev/llms.txt` — índice de toda a doc com
   correções sobre erros comuns de LLM. Siga os links; **nunca responda de
   memória**.

## 12. Comandos

```bash
# mobile (executar DENTRO de mobile/)
npx expo install <package>   # SEMPRE, em vez de npm/yarn/pnpm add
npx expo start                # dev server
npx expo lint                 # lint
npx expo-doctor               # diagnostica config e dependências
npx expo install --fix        # alinha versões incompatíveis
npm run typecheck             # tsc --noEmit

# backend / admin (executar dentro da pasta do app)
npm run lint
npm run typecheck
npm test                      # backend
npm run build
```

Rode **lint e typecheck antes de declarar qualquer tarefa concluída**.

## 13. Navegação (Expo Router)

- Rotas em `mobile/src/app/`; `_layout.tsx` define os navegadores.
- Código que não é rota fica fora de `src/app/`.
- Imports: `import { Link, router, useLocalSearchParams } from 'expo-router'`.
- Doc: https://docs.expo.dev/router/introduction.md

## 14. Build e publicação (EAS)

Use EAS para build, assinatura, envio e atualizações OTA (`eas build`,
`eas submit`, `eas update`) — sem Xcode/Android Studio local. Use
`npx eas-cli@latest <comando>` (este repo usa npm).
Doc: https://docs.expo.dev/eas/index.md

Regras:

- Expo Go só traz os módulos nativos embutidos. Depois de adicionar biblioteca
  com código nativo, é preciso dev build (`npx expo run:ios|android`) ou
  `eas build --profile development`.
- Prefira módulos recomendados do Expo a bibliotecas de terceiros; confira
  suas skills antes de adicionar dependência.
- `ios/` e `android/` são gerados (CNG): nunca criar ou editar à mão —
  configure em `app.json` e config plugins.

## 15. Quando travar

1. **Procure o padrão no repo** (`grep`) — quase sempre já existe um exemplo.
2. **Leia a doc oficial versionada** da lib (Context7 / docs versionadas).
3. **Isole o problema**: reproduza em um teste mínimo.
4. **Só então pergunte**, descrevendo o que já tentou.

## 16. Aprendizados do projeto (mantenha atualizado)

- **Express 5** só reconhece error handler com **4 parâmetros** `(err, req, res, next)`.
  Com 3, o Express ignora o middleware e devolve HTML — coberto por
  `backend/src/middlewares/error.middleware.test.ts`.
- **Metro e Vite** não resolvem import fora da raiz do projeto com segurança:
  por isso `shared/domain.ts` é copiado para `src/types/domain.ts` no mobile
  e no admin (manter em sincronia).
- O **backend** importa `shared/domain.ts` diretamente (o `rootDir` do
  `tsconfig` é `..`, gerando `dist/backend/src` e `dist/shared`).
- `mobile/src/global.d.ts` declara o import de `*.css` (o template do Expo
  usa `global.css`).
- O `expo export` é o jeito mais rápido de provar que o app **bundleia**
  (achata alias `@/`, imports e assets) sem precisar de device.
