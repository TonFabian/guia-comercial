# Limpeza de Duplicidades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover a empresa em destaque da lista secundária da Home, remover o login duplicado do menu do Perfil e retirar “Minha empresa” de Configurações.

**Architecture:** Regras de seleção viram funções puras testáveis (`home-companies.ts` e `profile-menu.ts`). A Home aplica o filtro com `useMemo`; o Perfil consome o menu puro; Configurações perde apenas a seção duplicada.

**Tech Stack:** Expo SDK 58, React Native, Expo Router, Vitest.

> **Sem commits nesta execução:** AGENTS.md proíbe commits sem pedido explícito.

---

### Task 1: Filtro da Home — teste primeiro

**Files:**
- Create: `mobile/src/features/home/home-companies.test.ts`
- Create: `mobile/src/features/home/home-companies.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';
import { excludeFeaturedCompany } from './home-companies';

function makeCompany(id: string, name: string): Company {
  return {
    _id: id,
    name,
    slug: id,
    description: '',
    category: 'outros',
  };
}

describe('excludeFeaturedCompany', () => {
  it('remove a empresa em destaque da lista secundária', () => {
    const featured = makeCompany('1', 'Construtora Alicerce');
    const other = makeCompany('2', 'Mercado Central');

    expect(excludeFeaturedCompany([featured, other], featured)).toEqual([other]);
  });

  it('mantém a lista quando não há destaque', () => {
    const companies = [makeCompany('1', 'A'), makeCompany('2', 'B')];

    expect(excludeFeaturedCompany(companies, null)).toEqual(companies);
  });

  it('não remove empresas apenas por nome igual', () => {
    const featured = makeCompany('1', 'A');
    const sameName = makeCompany('2', 'A');

    expect(excludeFeaturedCompany([featured, sameName], featured)).toEqual([sameName]);
  });

  it('preserva a ordem dos demais itens', () => {
    const featured = makeCompany('2', 'Destaque');
    const first = makeCompany('1', 'Primeira');
    const third = makeCompany('3', 'Terceira');

    expect(excludeFeaturedCompany([first, featured, third], featured)).toEqual([first, third]);
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/features/home/home-companies.test.ts`
Expected: FAIL com “Cannot find module './home-companies'”.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Company } from '@/types/domain';

/** Remove da lista secundária exatamente a empresa exibida em destaque. */
export function excludeFeaturedCompany(
  companies: Company[],
  featured: Company | null,
): Company[] {
  if (!featured) return companies;

  return companies.filter((company) => company._id !== featured._id);
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run src/features/home/home-companies.test.ts`
Expected: PASS (4 testes).

---

### Task 2: Aplicar o filtro na HomeScreen

**Files:**
- Modify: `mobile/src/app/(tabs)/index.tsx`

- [ ] **Step 1: Import the helper**

Adicionar após o import de `SectionHeader`:

```ts
import { excludeFeaturedCompany } from '@/features/home/home-companies';
```

- [ ] **Step 2: Compute the visible list**

Depois da declaração de `utilitiesToken` e antes dos efeitos, adicionar:

```ts
const visibleOtherCompanies = useMemo(
  () => excludeFeaturedCompany(otherCompanies, featuredCompany),
  [otherCompanies, featuredCompany],
);
```

- [ ] **Step 3: Pass the filtered list**

Trocar:

```tsx
<OtherCompanies companies={otherCompanies} loading={otherCompaniesLoading} error={otherCompaniesError} />
```

por:

```tsx
<OtherCompanies
  companies={visibleOtherCompanies}
  loading={otherCompaniesLoading}
  error={otherCompaniesError}
/>
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS; lint mantém apenas os 7 warnings pré-existentes.

---

### Task 3: Menu do Perfil — teste primeiro

**Files:**
- Create: `mobile/src/features/profile/profile-menu.test.ts`
- Create: `mobile/src/features/profile/profile-menu.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { buildMenu } from './profile-menu';

function ids(state: Parameters<typeof buildMenu>[0]) {
  return buildMenu(state).map((item) => item.id);
}

describe('buildMenu', () => {
  it('não inclui entrar no modo visitante', () => {
    expect(ids('guest')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });

  it('inclui sair apenas quando logado', () => {
    expect(ids('signedIn')).toEqual([
      'meus-dados',
      'minha-empresa',
      'configuracoes',
      'sair',
    ]);
  });

  it('não inclui entrar nem sair quando deslogado', () => {
    expect(ids('signedOut')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });

  it('não inclui entrar nem sair durante o loading', () => {
    expect(ids('loading')).toEqual(['meus-dados', 'minha-empresa', 'configuracoes']);
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run src/features/profile/profile-menu.test.ts`
Expected: FAIL com “Cannot find module './profile-menu'”.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { AuthStatus } from '@/providers/auth-provider';

export type MenuItemId = 'meus-dados' | 'minha-empresa' | 'configuracoes' | 'sair';

type MenuIcon =
  | 'person-outline'
  | 'business-outline'
  | 'settings-outline'
  | 'log-out-outline';

export interface MenuItem {
  id: MenuItemId;
  label: string;
  icon: MenuIcon;
}

const BASE_ITEMS: MenuItem[] = [
  { id: 'meus-dados', label: 'Meus dados', icon: 'person-outline' },
  { id: 'minha-empresa', label: 'Minha empresa', icon: 'business-outline' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings-outline' },
];

export function buildMenu(state: AuthStatus): MenuItem[] {
  if (state === 'signedIn') {
    return [...BASE_ITEMS, { id: 'sair', label: 'Sair', icon: 'log-out-outline' }];
  }

  return [...BASE_ITEMS];
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run src/features/profile/profile-menu.test.ts`
Expected: PASS (4 testes).

---

### Task 4: Consumir o menu puro no Perfil

**Files:**
- Modify: `mobile/src/features/profile/profile-screen.tsx`

- [ ] **Step 1: Update imports**

Trocar:

```ts
import { useState, type ComponentProps } from 'react';
```

por:

```ts
import { useState } from 'react';
```

Adicionar:

```ts
import { buildMenu } from './profile-menu';
import type { MenuItemId } from './profile-menu';
```

- [ ] **Step 2: Remove the local menu definitions**

Apagar o bloco:

```ts
type MenuItemId = 'meus-dados' | 'minha-empresa' | 'configuracoes' | 'entrar' | 'sair';

interface MenuItem {
  id: MenuItemId;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

function buildMenu(state: AuthStatus): MenuItem[] {
  const itens: MenuItem[] = [
    { id: 'meus-dados', label: 'Meus dados', icon: 'person-outline' },
    { id: 'minha-empresa', label: 'Minha empresa', icon: 'business-outline' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings-outline' },
  ];

  if (state === 'signedIn') {
    return [...itens, { id: 'sair', label: 'Sair', icon: 'log-out-outline' }];
  }

  return [...itens, { id: 'entrar', label: 'Entrar ou cadastrar', icon: 'log-in-outline' }];
}
```

- [ ] **Step 3: Remove the `entrar` route**

Apagar do `switch`:

```ts
case 'entrar':
  router.push('/(auth)/sign-in');
  return;
```

- [ ] **Step 4: Remove the unused type import**

Trocar:

```ts
import type { AuthStatus } from '@/providers/auth-provider';
```

por: remover a linha, pois `AuthStatus` não é mais usado diretamente.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS; testes mobile 95/95 (87 + 4 da Home + 4 do Perfil).

---

### Task 5: Remover “Minha empresa” de Configurações

**Files:**
- Modify: `mobile/src/features/settings/settings-screen.tsx`

- [ ] **Step 1: Remove the section**

Apagar o bloco:

```tsx
<Text style={styles.sectionTitle}>Minha empresa</Text>
<View style={styles.card}>
  <TouchableOpacity
    style={styles.row}
    onPress={() => router.push('/my-company')}
    accessibilityRole="button"
    accessibilityLabel="Abrir minha empresa"
  >
    <View style={styles.rowIcon}>
      <Ionicons name="business-outline" size={20} color={colors.primary} />
    </View>
    <View style={styles.rowBody}>
      <Text style={styles.rowLabel}>Minha empresa</Text>
      <Text style={styles.rowHint}>Horários, descrição e dados do estabelecimento.</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Confirm no leftover reference**

Run: `rg -n "Minha empresa|my-company|business-outline" src/features/settings/settings-screen.tsx`
Expected: nenhum resultado.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 6: Verificação final

**Files:**
- No changes.

- [ ] **Step 1: Run the mobile gate**

```bash
cd mobile
npm run typecheck
npm run lint
npm test
```

Expected: typecheck/lint sem erros; testes 95/95; 7 warnings pré-existentes.

- [ ] **Step 2: Prove the bundle**

```bash
npx expo export --platform web --output-dir /tmp/opencode/guia-export-limpeza
```

Expected: export concluído.

- [ ] **Step 3: Report**

Informar mudanças, testes e riscos. Nada foi commitado.
