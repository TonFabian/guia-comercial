# Indicadores de Paginação nos Carrosséis da Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar dots de paginação sincronizados abaixo dos carrosséis
“Empresas em Destaque” e “Outras Empresas & Serviços Locais”, acompanhando o
tema e ocultando-se quando não houver mais de uma página/item.

**Architecture:** A mudança é estritamente mobile e apresentacional. Dois
helpers puros concentram a matemática de offset e o modelo dos dots; um
componente reutilizável renderiza os indicadores; cada carrossel mantém seu
próprio `activeIndex` e informa `total`/`activeIndex` ao componente. Nenhuma
consulta, tipo de domínio ou API muda.

**Tech Stack:** React Native 0.88, Expo SDK 58, Expo Router, TypeScript,
tokens de `src/constants/theme.ts`, Vitest.

> **Commits:** não fazer `git add`, commit ou push nesta rodada. O usuário
> commitará pessoalmente. As tarefas abaixo não incluem etapa de commit.

**Spec:** `docs/superpowers/specs/2026-11-18-pagination-dots-carrosseis-design.md`

---

## File Structure

- Create: `mobile/src/utils/carousel-page.ts`
  - `pageIndexFromOffset(offsetX, pageWidth, total)`.
- Create: `mobile/src/utils/carousel-page.test.ts`
  - Testes do cálculo de página por offset.
- Create: `mobile/src/utils/pagination-dots.ts`
  - `PaginationDot` e `buildPaginationDots(total, activeIndex)`.
- Create: `mobile/src/utils/pagination-dots.test.ts`
  - Testes de visibilidade, contagem e clamp do dot ativo.
- Create: `mobile/src/components/PaginationDots.tsx`
  - Componente visual reutilizável; usa `buildPaginationDots` e
    `useThemeColors`.
- Modify: `mobile/src/constants/theme.ts`
  - Token `paginationInactive` em `GuiaColors` e `GuiaColorsLight`.
- Modify: `mobile/src/features/home/featured-companies.tsx`
  - Estado de página, `onScroll`, snap por card e dots.
- Modify: `mobile/src/features/home/other-companies.tsx`
  - Estado de página, `onScroll`, largura do carrossel e dots.
- No changes in `mobile/src/app/(tabs)/index.tsx`, `mobile/src/services/api.ts`,
  backend, shared types or admin.

### Testing note

O repo não usa RNTL. Toda a lógica testável (offset → índice e modelo dos dots)
fica em helpers puros com Vitest. A renderização visual é validada por lint,
typecheck, gate de tipografia, `expo export` e inspeção manual no Expo web.

O working tree já contém mudanças/untracked de tarefas anteriores (Docker,
specs, plano do carrossel). Não tocar nesses arquivos.

---

### Task 1: Cálculo do índice por offset (TDD)

**Files:**
- Create: `mobile/src/utils/carousel-page.test.ts`
- Create: `mobile/src/utils/carousel-page.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `mobile/src/utils/carousel-page.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { pageIndexFromOffset } from './carousel-page';

describe('pageIndexFromOffset', () => {
  it('mantém o primeiro índice no início', () => {
    expect(pageIndexFromOffset(0, 320, 3)).toBe(0);
  });

  it('avança um índice ao deslocar exatamente uma página', () => {
    expect(pageIndexFromOffset(320, 320, 3)).toBe(1);
  });

  it('arredonda para a página mais próxima', () => {
    expect(pageIndexFromOffset(449, 320, 3)).toBe(1);
    expect(pageIndexFromOffset(480, 320, 3)).toBe(2);
  });

  it('não retorna índice negativo', () => {
    expect(pageIndexFromOffset(-40, 320, 3)).toBe(0);
  });

  it('limita ao último índice', () => {
    expect(pageIndexFromOffset(2000, 320, 3)).toBe(2);
  });

  it('retorna zero quando há apenas uma página', () => {
    expect(pageIndexFromOffset(320, 320, 1)).toBe(0);
  });

  it('retorna zero quando a largura da página é inválida', () => {
    expect(pageIndexFromOffset(320, 0, 3)).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run (dentro de `mobile/`):

```bash
npx vitest run src/utils/carousel-page.test.ts
```

Expected: falha com erro de módulo não encontrado para `./carousel-page`.

- [ ] **Step 3: Implementar o mínimo**

Crie `mobile/src/utils/carousel-page.ts`:

```ts
/** Converte o deslocamento horizontal no índice da página mais próxima. */
export function pageIndexFromOffset(
  offsetX: number,
  pageWidth: number,
  total: number,
): number {
  if (total <= 1 || pageWidth <= 0) return 0;

  const rawIndex = Math.round(offsetX / pageWidth);
  return Math.min(Math.max(rawIndex, 0), total - 1);
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run (dentro de `mobile/`):

```bash
npx vitest run src/utils/carousel-page.test.ts
```

Expected: 7 testes passando.

---

### Task 2: Modelo dos dots (TDD)

**Files:**
- Create: `mobile/src/utils/pagination-dots.test.ts`
- Create: `mobile/src/utils/pagination-dots.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `mobile/src/utils/pagination-dots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildPaginationDots } from './pagination-dots';

describe('buildPaginationDots', () => {
  it('não cria dots quando há uma página ou menos', () => {
    expect(buildPaginationDots(1, 0)).toEqual([]);
    expect(buildPaginationDots(0, 0)).toEqual([]);
  });

  it('cria um dot por página e marca apenas o ativo', () => {
    expect(buildPaginationDots(3, 1)).toEqual([
      { index: 0, active: false },
      { index: 1, active: true },
      { index: 2, active: false },
    ]);
  });

  it('clampa índice negativo para o primeiro dot', () => {
    const dots = buildPaginationDots(3, -2);

    expect(dots.find((dot) => dot.active)?.index).toBe(0);
  });

  it('clampa índice acima do fim para o último dot', () => {
    const dots = buildPaginationDots(3, 99);

    expect(dots.find((dot) => dot.active)?.index).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run (dentro de `mobile/`):

```bash
npx vitest run src/utils/pagination-dots.test.ts
```

Expected: falha com erro de módulo não encontrado para `./pagination-dots`.

- [ ] **Step 3: Implementar o mínimo**

Crie `mobile/src/utils/pagination-dots.ts`:

```ts
export interface PaginationDot {
  index: number;
  active: boolean;
}

/** Gera o modelo de dots exibido pelo componente de paginação. */
export function buildPaginationDots(
  total: number,
  activeIndex: number,
): PaginationDot[] {
  if (total <= 1) return [];

  const currentIndex = Math.min(Math.max(activeIndex, 0), total - 1);

  return Array.from({ length: total }, (_, index) => ({
    index,
    active: index === currentIndex,
  }));
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run (dentro de `mobile/`):

```bash
npx vitest run src/utils/pagination-dots.test.ts
```

Expected: 4 testes passando.

---

### Task 3: Token de tema e componente `PaginationDots`

**Files:**
- Modify: `mobile/src/constants/theme.ts`
- Create: `mobile/src/components/PaginationDots.tsx`

- [ ] **Step 1: Adicionar o token inativo nos dois temas**

Em `GuiaColors`, depois de `borderSoft`:

```ts
  border: '#2E2E2E',
  borderSoft: '#222222',
  paginationInactive: '#4B5563',
```

Em `GuiaColorsLight`, depois de `borderSoft`:

```ts
  border: '#E5E7EB',
  borderSoft: '#F0F0F2',
  paginationInactive: '#D1D5DB',
```

- [ ] **Step 2: Criar o componente**

Crie `mobile/src/components/PaginationDots.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { buildPaginationDots } from '@/utils/pagination-dots';

const DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 20;
const DOT_GAP = 6;
const DOT_MARGIN_TOP = 10;

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
}

export function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const dots = buildPaginationDots(total, activeIndex);

  if (dots.length === 0) return null;

  const currentPage = dots.findIndex((dot) => dot.active) + 1;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Página ${currentPage} de ${dots.length}`}
    >
      {dots.map((dot) => (
        <View
          key={dot.index}
          style={[styles.dot, dot.active ? styles.activeDot : styles.inactiveDot]}
        />
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: DOT_GAP,
      marginTop: DOT_MARGIN_TOP,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
    },
    activeDot: {
      width: ACTIVE_DOT_WIDTH,
      backgroundColor: colors.primary,
    },
    inactiveDot: {
      backgroundColor: colors.paginationInactive,
    },
  });
}
```

Não adicione `fontSize`, `fontWeight` ou `lineHeight`; o componente não tem
texto. O comportamento de contagem, visibilidade e clamp já está coberto pelos
testes de `buildPaginationDots`; a aparência será validada manualmente.

- [ ] **Step 3: Rodar typecheck e lint do componente**

Run (dentro de `mobile/`):

```bash
npm run typecheck
npx expo lint
```

Expected: ambos sem erros.

---

### Task 4: Integrar dots em “Empresas em Destaque”

**Files:**
- Modify: `mobile/src/features/home/featured-companies.tsx`

- [ ] **Step 1: Atualizar imports**

No topo de `featured-companies.tsx`, troque:

```tsx
import { memo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
```

por:

```tsx
import { memo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { PaginationDots } from '@/components/PaginationDots';
import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
```

Adicione também, junto aos imports de `utils`:

```tsx
import { pageIndexFromOffset } from '@/utils/carousel-page';
```

- [ ] **Step 2: Adicionar estado, handler, snap e dots**

Substitua a função `FeaturedCompanies` por:

```tsx
export function FeaturedCompanies({ companies }: { companies: Company[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setActiveIndex(
        pageIndexFromOffset(
          event.nativeEvent.contentOffset.x,
          CARD_WIDTH + Spacing.two,
          companies.length,
        ),
      );
    },
    [companies.length],
  );

  if (companies.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" />
      <FlatList
        horizontal
        data={companies}
        keyExtractor={featuredCompanyKey}
        renderItem={renderFeaturedCompany}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={CARD_WIDTH + Spacing.two}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      <PaginationDots total={companies.length} activeIndex={activeIndex} />
    </View>
  );
}
```

O `useState` e o `useCallback` ficam antes do retorno antecipado para respeitar
as regras dos hooks. O total de dots é o número de empresas, não o número de
cards visíveis na viewport.

- [ ] **Step 3: Rodar o teste do helper e o typecheck**

Run (dentro de `mobile/`):

```bash
npx vitest run src/utils/carousel-page.test.ts
npm run typecheck
```

Expected: 7 testes do helper passando e typecheck sem erros.

---

### Task 5: Integrar dots em “Outras Empresas & Serviços Locais”

**Files:**
- Modify: `mobile/src/features/home/other-companies.tsx`

- [ ] **Step 1: Atualizar imports**

No topo de `other-companies.tsx`, troque:

```tsx
import { memo, useCallback, useMemo } from 'react';
```

por:

```tsx
import { memo, useCallback, useMemo, useState } from 'react';
```

Troque o import de tipos:

```tsx
import type { ListRenderItemInfo } from 'react-native';
```

por:

```tsx
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
```

Adicione o componente e o helper:

```tsx
import { PaginationDots } from '@/components/PaginationDots';
```

```tsx
import { pageIndexFromOffset } from '@/utils/carousel-page';
```

- [ ] **Step 2: Adicionar estado e handler**

Dentro de `OtherCompanies`, depois de `pages`, adicione:

```tsx
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setActiveIndex(
        pageIndexFromOffset(
          event.nativeEvent.contentOffset.x,
          pageWidth,
          pages.length,
        ),
      );
    },
    [pageWidth, pages.length],
  );
```

O total usa `pages.length` (duplas/páginas), não `companies.length`.

- [ ] **Step 3: Ajustar a largura e adicionar props/dots no `FlatList`**

No `FlatList` de páginas, adicione:

```tsx
          onScroll={handleScroll}
          scrollEventThrottle={16}
```

No `makeStyles`, troque:

```tsx
    carousel: { width: '100%' },
```

por:

```tsx
    carousel: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
```

Envolva o `FlatList` e os dots em um fragmento no ramo de sucesso:

```tsx
      ) : (
        <>
          <FlatList
            horizontal
            data={pages}
            keyExtractor={pageKey}
            renderItem={renderPage}
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            decelerationRate="fast"
            style={styles.carousel}
            testID="other-companies-carousel"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
          <PaginationDots total={pages.length} activeIndex={activeIndex} />
        </>
      )}
```

Não remova `pagingEnabled` nem `decelerationRate="fast"`. `MaxContentWidth` já
está importado no arquivo. A largura máxima centralizada garante que
`pagingEnabled` e o cálculo do índice usem o mesmo `pageWidth` em telas largas;
em telas de celular o valor é a própria largura da tela.

- [ ] **Step 4: Rodar typecheck e o teste do modelo dos dots**

Run (dentro de `mobile/`):

```bash
npm run typecheck
npx vitest run src/utils/pagination-dots.test.ts
```

Expected: typecheck sem erros e 4 testes passando.

---

### Task 6: Gate final do mobile e verificação visual

**Files:**
- Verify: todos os arquivos criados/modificados acima.

- [ ] **Step 1: Rodar lint**

Run (dentro de `mobile/`):

```bash
npx expo lint
```

Expected: sem erros.

- [ ] **Step 2: Rodar typecheck**

Run (dentro de `mobile/`):

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Rodar todos os testes**

Run (dentro de `mobile/`):

```bash
npm test
```

Expected: todos os arquivos e testes passando. A contagem esperada é **34
arquivos e 298 testes** (287 + 7 de `carousel-page` + 4 de `pagination-dots`).

- [ ] **Step 4: Rodar o gate de tipografia da §6.3**

Run (dentro de `mobile/`):

```bash
grep -rnE "fontSize:\s*[0-9]|fontWeight:\s*'[0-9]+'" src --include='*.ts' --include='*.tsx' \
  | grep -v 'src/constants/theme.ts' \
  | grep -vE '\.test\.(ts|tsx):' || true
```

Expected: sem saída.

- [ ] **Step 5: Provar que o app bundleia**

Run (dentro de `mobile/`):

```bash
npx expo export
```

Expected: `Exported: dist` com bundles de Android, iOS e web, sem erro. O aviso
pré-existente de favicon ausente (`./assets/images/icon.png`) não é bloqueante.

- [ ] **Step 6: Inspeção manual no Expo web**

Com o Expo web rodando, na Home:

1. Rolar até “Empresas em Destaque”.
2. Confirmar que a quantidade de dots é igual ao número de empresas do
   carrossel; no início, o primeiro dot está ativo em pílula.
3. Rolar horizontalmente e confirmar que o dot ativo acompanha o card mais
   próximo e que o snap encaixa um card por vez.
4. Rolar até “Outras Empresas & Serviços Locais”.
5. Confirmar duas empresas empilhadas por página e que a quantidade de dots é
   `ceil(total de empresas / 2)`.
6. Rolar horizontalmente e confirmar que o dot ativo acompanha a página.
7. Confirmar que os dots somem quando o carrossel tem apenas uma empresa
   (Destaques) ou uma página (Outras).
8. Confirmar visualmente que o dot ativo usa o amarelo/dourado do tema e os
   inativos são cinza, sem elementos cortados ou desalinhados.
9. Se possível, alternar o tema claro/escuro e confirmar que os dots continuam
   visíveis e legíveis.

Se o Expo web não estiver disponível ou o fluxo de autenticação bloquear a
home, registrar explicitamente no relatório que a verificação visual ficou
pendente; não declarar “pronto” sem dizer o que não foi verificado.

- [ ] **Step 7: Conferir o working tree**

Run (na raiz):

```bash
git status --short
```

Expected: apenas os arquivos desta feature e as mudanças/untracked anteriores
permanecem; nada staged por este agente.

Como o escopo é estritamente mobile, **não é necessário** rodar lint,
typecheck, testes ou build de backend/admin. Registrar essa justificativa no
relatório final.

---

## Self-Review

- **Cobertura da spec:** token de tema, componente, helper de offset, helper do
  modelo, integração nos dois carrosséis, ocultação com ≤1 item/página,
  acessibilidade, tema e verificação estão cobertos.
- **Placeholders:** não há TBD/TODO; todos os passos têm código ou comando.
- **Consistência de tipos:** `pageIndexFromOffset(offsetX, pageWidth, total)` e
  `buildPaginationDots(total, activeIndex)` são usados com a mesma assinatura
  nos testes, no componente e nas integrações.
- **Commits:** nenhuma etapa de commit, conforme instrução do usuário.
