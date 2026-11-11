# Redesign do painel admin — 2026-11-12

## Intenção

O painel admin atual (Vite + React 19) tem layout cru: inputs nativos soltos,
formulário apertado em cima da tabela, sem sistema de espaçamento ou hierarquia
visual. Redesenho completo com Tailwind v4, mantendo o dark e a identidade
(amarelo `#ffc107`) e a padronização de fontes do repo (Rubik headings, Inter
body — §7/§6.3). Nenhuma mudança funcional ou de API: mesmo comportamento,
mesmos dados, mesmos endpoints.

## Decisões (com o usuário)

- **Direção visual C — Dark console**: fundo `#16181d`, cards `#1d2026`,
  bordas `#2a2e36`, sombra/elevação nos cards, item ativo da sidebar marcado
  com borda esquerda amarela. Chips de plano com peso visual (Premium em
  destaque, Gratuito discreto).
- **Formulário de criar/editar = página dedicada** (não drawer/modal),
  **somente para a seção Empresas** — a única com formulário complexo hoje
  (plano/assinatura, horário, catálogo). As outras 10 seções recebem o
  visual novo mantendo o formulário no topo da lista; migram para página
  dedicada em fase futura, caso os campos cresçam. Empresas usa breadcrumb
  `← Empresas`, título, ações Salvar/Cancelar no topo e o formulário em
  **seções** (Dados básicos → Contato → Assinatura → Horário de
  funcionamento). Botão de volta volta à lista.
- **Navegação por estado** (`useState` atual, sem router) — mantém "nada
  muda funcionalmente". Refactor de extração de componentes compartilhados
  é permitido (comportamento-preservante). `src/theme/typography.ts`
  permanece como espelho string das CSS vars (§7); tokens de cor/raio/sombra
  entram no `@theme` do Tailwind. Ordem de implementação: Empresas primeiro
  (valida o padrão), depois replicar o visual nas demais.
- **Mobile-first**: base projetada para celular, ampliando para tablet e
  desktop.
  - < 640px: sidebar vira **barra superior com menu hambúrguer** (drawer
    temporário) ou **nav inferior por ícones** — decisão no spike; tabelas
    viram **cards/lista empilhada** (sem tabela horizontal com scroll);
    formulário em coluna única.
  - 640–1024px: sidebar estreita (só ícones), tabelas podem virar lista,
    formulário em 2 colunas.
  - ≥ 1024px: sidebar completa com labels, tabelas completas, formulário
    em grid de 2 colunas.
  - Regra: nada de scroll horizontal em tabelas no celular; cada seção
    escolhe colunas essenciais para a visão mobile.

## Componentes-base (reutilizáveis pelas 11 seções)

Sidebar/nav responsiva · Topbar (título + busca + ações) · Table (com
variante lista p/ mobile) · Card · Input/Select/Textarea/Checkbox · Button
(primário amarelo, secundário neutro, destrutivo) · Chip de plano/badge ·
Paginação · Estado vazio/erro (os erros de API hoje são `<p>` soltos).

## Constraints

- Tailwind v4 via plugin `@tailwindcss/vite` (Vite 7 já em uso). Sem
  biblioteca de componentes (shadcn/MUI) — painel pequeno, ~6 componentes
  compartilhados; lib adicionaria peso.
- Tokens em `@theme` do Tailwind (cores, raios, sombras, breakpoints) —
  fonte única de valores (regra do repo). As fontes Rubik/Inter continuam
  self-hosted via `styles.css`.
- Tipografia: títulos Rubik (`--font-family-heading`), corpo Inter;
  tamanhos em `rem` via escala `xs/sm/md/lg/xg` — espelho da §6.3.
- Não tocar em `services/api.ts`, endpoints, nem na lógica de gate
  (auth-gate mantém os estilos atuais, atualizados para os novos tokens).
- Admin não tem testes de renderização; gate = typecheck + lint + build +
  verificação visual no Playwright (desktop e viewport mobile 390px).

## Abordagens consideradas

1. **Tailwind puro** (escolhido) — controle total, bundle pequeno, tokens
   em `@theme`. Custo: escrever os componentes à mão (já são poucos).
2. Tailwind + shadcn/ui — componentes prontos, mas Radix + dependências
   novas e estilos que brigaríamos para casar com o dark console.
3. Refinar o CSS atual — mais barato, mas herda a estrutura sem
   hierarquia e não atende mobile-first.

## Fora de escopo

- Novas funcionalidades; mudança de endpoints; dark/light toggle (só dark).
- Mobile app (Expo) — intocado.
