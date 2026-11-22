# Indicadores de Paginação nos Carrosséis da Home — Design

Data: 2026-11-18
Status: Aprovado para implementação

## Intent

Adicionar indicadores visuais de página (dots) abaixo dos carrosséis horizontais
da Home para tornar explícita a existência de mais conteúdo lateral e indicar a
posição atual:

- **Empresas em Destaque**: um ponto por empresa em destaque.
- **Outras Empresas & Serviços Locais**: um ponto por página/coluna, onde cada
  página contém dois cards empilhados.

Os indicadores devem ser discretos, acompanhar o tema claro/escuro do app e não
aparecer quando não houver rolagem possível.

## Decisões

| Tema | Decisão |
| --- | --- |
| Componente | `PaginationDots` reutilizável em `src/components/PaginationDots.tsx` |
| Props | `total: number`, `activeIndex: number` |
| Exibição | `null` quando `total <= 1` |
| Layout | Centralizado, `marginTop: 10`, `gap: 6` |
| Ponto ativo | Pílula `20 × 6`, raio `3`, cor `colors.primary` |
| Pontos inativos | Círculos `6 × 6`, raio `3`, token `colors.paginationInactive` |
| Tema | Acompanha claro/escuro via `useThemeColors` |
| Animação | Nenhuma; troca instantânea |
| Cálculo do índice | Helper puro `pageIndexFromOffset` em `src/utils/carousel-page.ts` |
| Modelo dos dots | Helper puro `buildPaginationDots` em `src/utils/pagination-dots.ts` |
| Destaques | Total = `companies.length`; intervalo = `CARD_WIDTH + Spacing.two` |
| Outras Empresas | Total = `pages.length`; intervalo = `pageWidth` |
| Atualização | `onScroll` com `scrollEventThrottle={16}` |
| Acessibilidade | `accessible` + `accessibilityLabel="Página X de Y"` no container |
| Dados/API | Nenhuma mudança |

## Comportamento

### `PaginationDots`

- Recebe `total` e `activeIndex`.
- Usa `buildPaginationDots` para decidir visibilidade, quantidade e índice ativo.
- Se a lista de dots for vazia, não renderiza nada.
- Clampa `activeIndex` para o intervalo válido antes de renderizar.
- Renderiza uma linha de pontos com o ativo em formato de pílula e os demais
  como círculos.
- O container é centralizado horizontalmente e usa `marginTop: 10` e `gap: 6`.
- O componente não conhece scroll, FlatList ou regras de negócio.

### Helper do modelo dos dots

`buildPaginationDots(total, activeIndex): PaginationDot[]`

- Retorna `[]` quando `total <= 1`.
- Caso contrário, gera um item por página (`index`) e marca `active` no índice
  clampado entre `0` e `total - 1`.
- Não tem estado nem dependência de React Native; é testável com Vitest.

### Helper de índice

`pageIndexFromOffset(offsetX, pageWidth, total): number`

- Retorna `0` quando `total <= 1` ou `pageWidth <= 0`.
- Caso contrário: arredonda `offsetX / pageWidth` e clampa entre `0` e
  `total - 1`.
- Não tem estado nem dependência de React Native; é testável com Vitest.

### Empresas em Destaque

- Mantém `activeIndex` local.
- O `FlatList` horizontal ganha:
  - `snapToInterval={CARD_WIDTH + Spacing.two}`;
  - `decelerationRate="fast"`;
  - `onScroll` com `scrollEventThrottle={16}`.
- O handler calcula o índice com `pageIndexFromOffset(offsetX, CARD_WIDTH + Spacing.two, companies.length)`.
- `PaginationDots` é renderizado abaixo da lista com:
  - `total={companies.length}`;
  - `activeIndex={activeIndex}`.
- O comportamento atual de retornar `null` quando não há empresas permanece.

### Outras Empresas & Serviços Locais

- Mantém `activeIndex` local.
- O `FlatList` horizontal mantém `pagingEnabled` e `decelerationRate="fast"`.
- A largura do `FlatList` é limitada a `MaxContentWidth` e centralizada, para
  que o encaixe de `pagingEnabled` use a mesma largura das páginas em telas
  largas.
- O handler calcula o índice com `pageIndexFromOffset(offsetX, pageWidth, pages.length)`.
- `PaginationDots` é renderizado abaixo da lista com:
  - `total={pages.length}`;
  - `activeIndex={activeIndex}`.
- Dots não aparecem em loading, erro, lista vazia ou quando há só uma página.

## Tema e estilo

- Adicionar `paginationInactive` em `GuiaColors` (`#4B5563`) e em
  `GuiaColorsLight` (`#D1D5DB`).
- O ponto ativo usa `colors.primary`.
- Medidas específicas do componente ficam em constantes nomeadas no próprio
  arquivo (`DOT_SIZE`, `ACTIVE_DOT_WIDTH`, `DOT_GAP`, `DOT_MARGIN_TOP`), pois
  descrevem o componente, não o espaçamento global do app.
- Sem `fontSize`, `fontWeight` ou `lineHeight` no componente.

## Arquitetura

- Criar `mobile/src/components/PaginationDots.tsx`.
- Criar `mobile/src/utils/carousel-page.ts`.
- Criar `mobile/src/utils/carousel-page.test.ts`.
- Criar `mobile/src/utils/pagination-dots.ts`.
- Criar `mobile/src/utils/pagination-dots.test.ts`.
- Modificar `mobile/src/features/home/featured-companies.tsx`.
- Modificar `mobile/src/features/home/other-companies.tsx`.
- Modificar `mobile/src/constants/theme.ts` para o token inativo.
- Nenhuma mudança em backend, API, tipos de domínio ou admin.

## Testes e verificação

TDD do helper:

- offset `0` → índice `0`;
- offset equivalente a uma página → índice `1`;
- offset no meio de uma página → arredonda para o ponto mais próximo;
- offset negativo → `0`;
- offset além do fim → último índice;
- `total = 1` → `0`;
- `pageWidth = 0` → `0`.

TDD do modelo dos dots:

- `total <= 1` → lista vazia;
- `total = 3` e `activeIndex = 1` → três dots, só o índice `1` ativo;
- `activeIndex` negativo ou maior que o último → clampado;
- a quantidade de dots é igual ao total de páginas/itens.

O repo não usa RNTL; a UI será validada por:

- `npx expo lint`;
- `npm run typecheck`;
- `npm test`;
- gate de tipografia da §6.3;
- `npx expo export`;
- inspeção manual no Expo web, verificando:
  - dots abaixo dos dois carrosséis;
  - quantidade correta em Destaques (empresas) e Outras (páginas/duplas);
  - sincronização do ponto ativo ao rolar;
  - ausência de dots com apenas um item/página.

Como o escopo é estritamente mobile, o gate dos demais apps não é necessário;
isso deve constar no relatório final.

## Riscos

- Em “Empresas em Destaque”, o carrossel mostra parcialmente o próximo card; o
  arredondamento pelo intervalo mantém o ponto alinhado ao card mais próximo.
- Em telas largas, o `FlatList` de “Outras” é limitado a `MaxContentWidth` e
  centralizado; assim, `pagingEnabled` e o cálculo do dot usam a mesma largura.
- A última página de “Outras” pode ter um card; o total de dots continua sendo
  o número de páginas.
- O helper é puro, mas a integração com `FlatList` ainda depende de validação
  manual, pois não há RNTL no projeto.

## Critérios de sucesso

- Componente `PaginationDots` tipado, reutilizável e sem dependência de dados.
- Dots centralizados abaixo dos dois carrosséis da Home.
- Destaques: um dot por empresa; ativo acompanha a rolagem.
- Outras Empresas: um dot por dupla/página; ativo acompanha a rolagem.
- Nenhum dot quando há apenas um item/página.
- Cores acompanham o tema; medidas e tipografia respeitam os tokens.
- Lint, typecheck, testes, gate de tipografia e `expo export` verdes.
