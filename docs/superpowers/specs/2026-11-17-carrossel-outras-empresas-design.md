# Carrossel de Outras Empresas — Design

Data: 2026-11-17
Status: Aprovado para implementação (design revisado pelo usuário)

## Intent

A seção "Outras Empresas & Serviços Locais" hoje usa uma lista vertical. O
usuário quer navegação horizontal em páginas, com duas empresas por página
(uma em cima da outra), para descobrir as demais empresas cadastradas sem
percorrer uma lista longa.

A seção passa a ser um carrossel horizontal paginado com todas as empresas não
premium, mantendo básicas antes das gratuitas. O selo "Gratuito" deixa de
aparecer nesta seção; o selo "Básico" permanece. O acesso ao detalhe, ao
WhatsApp e o link "Ver todas" continuam disponíveis.

## Decisões

| Tema | Decisão |
| --- | --- |
| Formato | Carrossel horizontal paginado substitui a lista vertical |
| Página | Ocupa a largura útil da tela, limitada a `MaxContentWidth` (800) |
| Empresas por página | 2, empilhadas verticalmente; última página pode ter 1 |
| Empresas exibidas | Básicas + gratuitas; premium continua em "Empresas em Destaque" |
| Ordem | `sortCompaniesByPlan` (básico antes de free, nome dentro do grupo) |
| Selo | "Gratuito" oculto; "Básico" permanece quando o plano for basic |
| Card | Linha compacta full-width com ícone, nome, categoria/endereço, selo e WhatsApp |
| Toque no card | Abre o detalhe da empresa |
| WhatsApp | Abre o WhatsApp quando houver `whatsapp` ou `phone`; senão oculta a ação |
| "Ver todas" | Permanece no cabeçalho, levando para `/search` |
| Rolagem | Encaixe por página (`pagingEnabled` + `decelerationRate="fast"`) |
| Dados | Sem mudança de API/backend; mantém `getCompanies(1, 50, undefined, ['basic','free'])` |
| Limite | 50 itens por consulta, como hoje; catálogo completo via busca |

## Non-goals

- Não alterar backend, contrato da API, banco ou tipos de domínio.
- Não criar paginação infinita dentro da página.
- Não mudar a seção "Empresas em Destaque".
- Não redesenhar a busca, o detalhe da empresa ou os planos.
- Não adicionar biblioteca de UI ou de testes.
- Não adicionar indicador de bolinhas/página.

## Comportamento

### Seção

- O título "Outras Empresas & Serviços Locais" e o link "Ver todas" continuam.
- O conteúdo vira uma `FlatList` horizontal.
- Cada item da lista é uma página com dois cards empilhados.
- Estados preservados:
  - carregando → `ActivityIndicator` centralizado;
  - erro → mensagem atual;
  - lista vazia → "Nenhuma empresa cadastrada".
- A seção não some quando vazia; mostra o estado vazio.

### Página

- Largura: `Math.min(windowWidth, MaxContentWidth)`.
- Padding horizontal interno de `Spacing.three` (16), então os cards ocupam a
  largura útil.
- `pagingEnabled` (com cada página na largura do viewport) e
  `decelerationRate="fast"` para encaixar uma página por rolagem.
- Sem gap entre páginas no `contentContainerStyle`; o espaçamento fica dentro
  da página.
- A última página pode conter apenas uma empresa.

### Card

Card full-width em linha, com:

- ícone de categoria em um bloco visual;
- nome da empresa em uma linha;
- categoria e endereço em uma linha secundária (endereço omitido se ausente);
- `PlanBadge` na mesma linha da categoria, apenas quando o plano for `basic`
  (ou outro não-free);
- botão circular de WhatsApp quando houver `whatsapp` ou `phone`;
- área principal clicável abrindo o detalhe; o botão de WhatsApp não dispara a
  navegação do card.

O card usa `React.memo`, `keyExtractor` por id estável da página e `renderItem`
estável com `useCallback` dependente apenas da largura da página.

### Agrupamento

Novo helper puro `mobile/src/features/home/other-companies-view.ts`:

- `paginateOtherCompanies(companies: Company[])` agrupa em duplas na ordem
  recebida.
- Cada página tem `id` baseado no `_id` da primeira empresa do grupo.
- Lista vazia → nenhuma página.
- A função não filtra plano nem ordena; isso continua no componente/API.

## Arquitetura

- Produção:
  - `mobile/src/features/home/other-companies.tsx`
  - novo `mobile/src/features/home/other-companies-view.ts`
- Teste:
  - novo `mobile/src/features/home/other-companies-view.test.ts`
- Sem mudança em `mobile/src/app/(tabs)/index.tsx`: a tela continua passando
  `otherCompanies`, `loading` e `error` com a mesma query.
- Sem mudança em `mobile/src/services/api.ts` ou no backend.
- O componente continua aplicando `sortCompaniesByPlan`; a lista já chega
  filtrada para `basic,free` pela camada de dados.

## Acessibilidade e estilo

- Card principal com `accessibilityRole="button"` e
  `accessibilityLabel` contendo nome e categoria.
- Botão de WhatsApp com `accessibilityRole="button"` e label específico.
- Cores, espaçamentos, raios e tipografia somente via tokens de
  `src/constants/theme.ts` (`Spacing`, `Radius`, `Typography`, `MaxContentWidth`).
- Sem `fontSize`, `fontWeight` ou `lineHeight` crus.

## Testes e verificação

- TDD do helper:
  - 5 empresas → 3 páginas (2, 2, 1);
  - ordem preservada;
  - lista vazia → [];
  - `id` da página é o `_id` da primeira empresa.
- O repo não usa RNTL; a UI é validada por:
  - `npx expo lint`;
  - `npm run typecheck`;
  - `npm test`;
  - grep de tipografia da §6.3;
  - `npx expo export`;
  - inspeção manual no Expo: rolagem por página, dois cards por página, selo
    "Gratuito" ausente, selo "Básico" presente, toque no card e WhatsApp.

Como o escopo é estritamente mobile, o gate dos outros apps não é necessário;
essa justificativa deve constar no relatório final.

## Riscos

- O carrossel mantém o teto de 50 itens. Se houver mais empresas não premium,
  o usuário ainda precisa de "Ver todas" para acessar o restante.
- O botão de WhatsApp usa `whatsapp ?? phone`, como o card atual; telefones fixos
  podem abrir o WhatsApp sem uma conta válida. O comportamento existente é
  preservado para não ampliar o escopo.
- Em telas muito largas, a página é limitada a 800px para acompanhar o canvas
  do app; o espaço extra fica centralizado pelo layout global.
- A última página com uma empresa fica alinhada ao topo da página, sem card
  fantasma.

## Critérios de sucesso

- "Outras Empresas & Serviços Locais" exibe um carrossel horizontal paginado.
- Cada página mostra duas empresas empilhadas; a última pode mostrar uma.
- O usuário consegue deslizar e acessar todas as empresas básicas e gratuitas
  retornadas pela consulta atual.
- Empresas básicas aparecem antes das gratuitas.
- O selo "Gratuito" não aparece; "Básico" continua aparecendo.
- Tocar no card abre o detalhe; o WhatsApp funciona quando há contato.
- Loading, erro e vazio continuam funcionando.
- Lint, typecheck, testes, gate de tipografia e `expo export` verdes no mobile.
