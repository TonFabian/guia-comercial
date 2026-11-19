# Carrossel de Outras Empresas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar “Outras Empresas & Serviços Locais” em um carrossel
horizontal paginado, com duas empresas empilhadas por página e sem o selo
“Gratuito”.

**Architecture:** A mudança é estritamente mobile e apresentacional, com uma
nova função pura para agrupar empresas em duplas. A consulta, o filtro
`basic,free`, a ordenação e o link “Ver todas” permanecem. O componente usa a
largura útil da tela (`min(windowWidth, MaxContentWidth)`) para encaixar uma
página por rolagem.

**Tech Stack:** React Native 0.88, Expo SDK 58, Expo Router, TypeScript,
tokens de `src/constants/theme.ts`, Vitest.

> **Commits:** o usuário pediu para não commitar nem fazer stage nesta rodada.
> As etapas abaixo não incluem commit; o usuário commitará depois.

---

## File Structure

- Create: `mobile/src/features/home/other-companies-view.ts`
  - `OtherCompaniesPage`, `COMPANIES_PER_PAGE` e
    `paginateOtherCompanies(companies)`.
- Create: `mobile/src/features/home/other-companies-view.test.ts`
  - Testa o agrupamento em duplas, a ordem e a lista vazia.
- Modify: `mobile/src/features/home/other-companies.tsx`
  - Página full-width com dois cards; `FlatList` horizontal com snap.
  - Remove o selo “Gratuito”; mantém “Básico”.
  - Card em linha compacta, com WhatsApp circular.
- No changes in `mobile/src/app/(tabs)/index.tsx`, `mobile/src/services/api.ts`,
  backend, shared types or admin.

### Testing note

O repo não usa RNTL. A nova regra de agrupamento é testada com Vitest puro. A
UI é validada por lint, typecheck, testes, gate de tipografia, `expo export` e
inspeção manual no Expo (incluindo rolagem, cards, selo e WhatsApp).

---

### Task 1: Agrupamento em duplas (TDD)

**Files:**
- Create: `mobile/src/features/home/other-companies-view.test.ts`
- Create: `mobile/src/features/home/other-companies-view.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `mobile/src/features/home/other-companies-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';
import { paginateOtherCompanies } from './other-companies-view';

function makeCompany(id: string): Company {
  return {
    _id: id,
    name: `Empresa ${id}`,
    slug: id,
    description: '',
    category: 'outros',
  };
}

describe('paginateOtherCompanies', () => {
  it('agrupa duas empresas por página e deixa a sobra na última', () => {
    const companies = ['a', 'b', 'c', 'd', 'e'].map(makeCompany);

    const pages = paginateOtherCompanies(companies);

    expect(pages.map((page) => page.id)).toEqual(['a', 'c', 'e']);
    expect(pages.map((page) => page.companies.map((company) => company._id))).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
  });

  it('não cria página quando a lista está vazia', () => {
    expect(paginateOtherCompanies([])).toEqual([]);
  });
});
```

Run (inside `mobile/`):

```bash
npx vitest run src/features/home/other-companies-view.test.ts
```

Expected: o teste falha porque `./other-companies-view` ainda não existe.

- [ ] **Step 2: Implementar o helper**

Crie `mobile/src/features/home/other-companies-view.ts`:

```ts
import type { Company } from '@/types/domain';

export const COMPANIES_PER_PAGE = 2;

export interface OtherCompaniesPage {
  id: string;
  companies: Company[];
}

export function paginateOtherCompanies(companies: Company[]): OtherCompaniesPage[] {
  const pages: OtherCompaniesPage[] = [];

  for (let index = 0; index < companies.length; index += COMPANIES_PER_PAGE) {
    const group = companies.slice(index, index + COMPANIES_PER_PAGE);
    const first = group[0];
    if (!first) continue;

    pages.push({ id: first._id, companies: group });
  }

  return pages;
}
```

Rode novamente:

```bash
npx vitest run src/features/home/other-companies-view.test.ts
```

Expected: 2 testes passando.

---

### Task 2: Carrossel de duas empresas por página

**Files:**
- Modify: `mobile/src/features/home/other-companies.tsx`

- [ ] **Step 1: Baseline — confirmar ordenação/filtro existentes**

Run (inside `mobile/`):

```bash
npx vitest run src/features/company/company-plan.test.ts
```

Expected: todos os testes passam. Isso confirma que “básico antes de free” já
está coberto antes da mudança visual.

- [ ] **Step 2: Substituir o conteúdo de `other-companies.tsx`**

Substitua o arquivo inteiro por:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { companyPlan, sortCompaniesByPlan } from '@/features/company/company-plan';
import { PlanBadge } from '@/features/company/plan-badge';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { openWhatsApp } from '@/utils/links';
import { paginateOtherCompanies } from './other-companies-view';
import type { OtherCompaniesPage } from './other-companies-view';
import { SectionHeader } from './section-header';

const OtherCompanyCard = memo(function OtherCompanyCard({ company }: { company: Company }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const contato = company.whatsapp ?? company.phone;
  const plano = companyPlan(company);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Empresa ${company.name}, ${categoryLabel(company.category)}`}
        onPress={() => router.push({ pathname: '/company/[id]', params: { id: company._id } })}
      >
        <View style={styles.thumb}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {company.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {categoryLabel(company.category)}
              {company.address ? ` · ${company.address}` : ''}
            </Text>
            {plano !== 'free' ? <PlanBadge plan={plano} /> : null}
          </View>
        </View>
      </TouchableOpacity>
      {contato ? (
        <TouchableOpacity
          style={styles.whatsappBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`WhatsApp ${company.name}`}
          onPress={() => {
            if (contato) void openWhatsApp(contato);
          }}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.background} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const OtherCompaniesPageItem = memo(function OtherCompaniesPageItem({
  page,
  pageWidth,
}: {
  page: OtherCompaniesPage;
  pageWidth: number;
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.page, { width: pageWidth }]}>
      {page.companies.map((company) => (
        <OtherCompanyCard key={company._id} company={company} />
      ))}
    </View>
  );
});

const pageKey = (page: OtherCompaniesPage) => page.id;

interface Props {
  companies: Company[];
  loading?: boolean;
  error?: string | null;
}

export function OtherCompanies({ companies, loading = false, error = null }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);

  const pages = useMemo(
    () => paginateOtherCompanies(sortCompaniesByPlan(companies)),
    [companies],
  );

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<OtherCompaniesPage>) => (
      <OtherCompaniesPageItem page={item} pageWidth={pageWidth} />
    ),
    [pageWidth],
  );

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Outras Empresas & Serviços Locais"
        actionLabel="Ver todas"
        onAction={() => router.push('/search')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : pages.length === 0 ? (
        <Text style={styles.empty}>Nenhuma empresa cadastrada</Text>
      ) : (
        <FlatList
          horizontal
          data={pages}
          keyExtractor={pageKey}
          renderItem={renderPage}
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          decelerationRate="fast"
          testID="other-companies-carousel"
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: Spacing.four },
    page: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.three,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      padding: Spacing.three,
    },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: Radius.iconBox,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: Spacing.half },
    name: { color: colors.text, ...Typography.h5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
    meta: { flex: 1, color: colors.textSecondary, ...Typography.body },
    whatsappBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      backgroundColor: colors.whatsapp,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.three,
    },
    center: { paddingVertical: Spacing.three, alignItems: 'center' },
    empty: {
      color: colors.textSecondary,
      ...Typography.caption,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
  });
}
```

Não adicione `fontSize`, `fontWeight` ou `lineHeight` literais. Não use
`ScrollView` com `.map()`.

- [ ] **Step 3: Rodar o gate do mobile**

Run (inside `mobile/`):

```bash
npx expo lint
npm run typecheck
npm test
```

Expected:
- `expo lint`: sem erros;
- `typecheck`: exit 0;
- `npm test`: todos os arquivos e testes passando; a contagem esperada é 32
  arquivos e 287 testes (285 + 2 do helper).

- [ ] **Step 4: Rodar o gate de tipografia da §6.3**

Run (inside `mobile/`):

```bash
grep -rnE "fontSize:\s*[0-9]|fontWeight:\s*'[0-9]+'" src --include='*.ts' --include='*.tsx' \
  | grep -v 'src/constants/theme.ts' \
  | grep -vE '\.test\.(ts|tsx):' || true
```

Expected: sem saída.

- [ ] **Step 5: Provar que o app bundleia**

Run (inside `mobile/`):

```bash
npx expo export
```

Expected: `Exported: dist` com bundles de Android, iOS e web, sem erro. O aviso
pré-existente de favicon ausente (`./assets/images/icon.png`) não é bloqueante.

- [ ] **Step 6: Inspeção manual no Expo web**

Com o Expo web rodando (`npx expo start --web`), na home:

1. Rolar até “Outras Empresas & Serviços Locais”.
2. Confirmar duas empresas empilhadas por página e que a rolagem horizontal
   encaixa a próxima página.
3. Confirmar que empresas básicas aparecem antes das gratuitas.
4. Confirmar que “Gratuito” não aparece e que “Básico” permanece nos cards
   básicos.
5. Tocar em um card e confirmar que abre a tela da empresa.
6. Tocar no botão de WhatsApp de um card com contato e confirmar que não abre
   o detalhe por engano.
7. Se a lista estiver vazia, confirmar “Nenhuma empresa cadastrada”.

Se o Expo web não estiver disponível ou o fluxo de autenticação bloquear a
home, registrar explicitamente no relatório que a verificação visual ficou
pendente; não declarar “pronto” sem dizer o que não foi verificado.

---

### Task 3: Conferência final do working tree

**Files:**
- Verify the two production files and the test file.

- [ ] **Step 1: Conferir diff e escopo**

Run (na raiz do repo):

```bash
git diff --check
git diff -- mobile/src/features/home/other-companies.tsx
git status --short
```

Expected:
- `git diff --check` sem saída;
- o diff de produção contém `other-companies.tsx`;
- os novos `other-companies-view.ts` e `other-companies-view.test.ts` aparecem
  como untracked;
- nenhum arquivo Docker ou mudança fora do escopo é incluído por engano.

- [ ] **Step 2: Não commitar**

Não rode `git add`, `git commit` ou `git push`. O working tree deve ficar
finalizado para o usuário commitar.

- [ ] **Step 3: Relatório final**

Informe:
- os arquivos alterados/criados;
- os comandos executados e os resultados reais;
- se a inspeção manual foi feita ou ficou pendente;
- riscos remanescentes (teto de 50 itens; WhatsApp usando `phone` como
  fallback; última página com uma empresa).

---

## Self-Review

**Spec coverage:**
- Duas empresas por página, uma em cima da outra → Task 2, `pages` + página
  com dois cards.
- Página full-width com snap → `pageWidth` + `pagingEnabled`.
- Última página com uma empresa → helper de duplas + teste.
- “Gratuito” oculto e “Básico” mantido → `plano !== 'free'` no card.
- Básicas antes de gratuitas → `sortCompaniesByPlan` dentro do `useMemo`.
- Toque abre detalhe; WhatsApp separado → `cardMain` e `whatsappBtn`.
- “Ver todas”, loading, erro e vazio → preservados.
- Sem mudança de API/backend → File Structure.
- TDD do agrupamento → Task 1.
- Gate mobile e inspeção manual → Task 2, Steps 3–6.
- Sem commit/stage → Task 3, Step 2.

**Placeholder scan:** sem TBD/TODO; todos os comandos e código estão
explícitos.

**Type consistency:** `Company`, `Plan`, `companyPlan`, `sortCompaniesByPlan`,
`PlanBadge`, `openWhatsApp`, `MaxContentWidth`, `Spacing`, `Radius`,
`Typography` e `useThemeColors` existem nos arquivos atuais.
`OtherCompaniesPage` é exportado pelo helper e usado no componente/teste.
`pagingEnabled` e `decelerationRate` são props de `FlatList`.
