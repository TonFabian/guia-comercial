# Detalhes de empresa gratuita — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir uma tela de detalhes enxuta para empresas sem destaque (`isFeatured !== true`), mantendo a tela completa atual para empresas em destaque.

**Architecture:** A rota única `/company/[id]` já busca a empresa em `CompanyDetailScreen`; depois de montar os detalhes, o componente decide entre o layout completo atual e o novo `CompanyFreeDetailScreen`. A regra e o view model ficam em `company-free-view.ts`, cobertos por Vitest; a UI consome apenas tokens do theme.

**Tech Stack:** Expo SDK 58, Expo Router, React Native 0.88, TypeScript, Vitest, `expo-image`, `expo-linear-gradient`, `@expo/vector-icons`.

> **Commits:** o AGENTS exige pedido explícito do usuário para commitar. Execute os passos de commit apenas se o usuário autorizar.

---

### Task 1: Regra de variante (`full` vs `free`)

**Files:**
- Create: `mobile/src/features/company/company-free-view.ts`
- Test: `mobile/src/features/company/company-free-view.test.ts`

- [x] **Step 1: Escrever o teste que falha**

Crie `mobile/src/features/company/company-free-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { companyDetailVariant } from './company-free-view';

function empresa(overrides: Partial<Company> & { _id: string }): Company {
  return {
    name: `Empresa ${overrides._id}`,
    slug: `empresa-${overrides._id}`,
    description: 'Descrição da empresa.',
    category: '1',
    ...overrides,
  };
}

describe('companyDetailVariant', () => {
  it('usa a tela completa para empresa em destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: true }))).toBe('full');
  });

  it('usa a tela enxuta para empresa sem destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: false }))).toBe('free');
  });

  it('usa a tela enxuta quando isFeatured não está definido', () => {
    expect(companyDetailVariant(empresa({ _id: '1' }))).toBe('free');
  });
});
```

- [x] **Step 2: Rodar o teste e ver falhar**

Em `mobile/`:

```bash
npm test -- src/features/company/company-free-view.test.ts
```

Esperado: FAIL — `Cannot find module './company-free-view'`.

- [x] **Step 3: Implementar o mínimo**

Crie `mobile/src/features/company/company-free-view.ts`:

```ts
import type { Company } from '@/types/domain';

export type CompanyDetailVariant = 'full' | 'free';

export function companyDetailVariant(company: Company): CompanyDetailVariant {
  return company.isFeatured === true ? 'full' : 'free';
}
```

- [x] **Step 4: Rodar o teste e ver passar**

Em `mobile/`:

```bash
npm test -- src/features/company/company-free-view.test.ts
```

Esperado: PASS — 3 testes.

- [ ] **Step 5: Commit (somente com autorização explícita)**

```bash
git add mobile/src/features/company/company-free-view.ts mobile/src/features/company/company-free-view.test.ts
git commit -m "feat(mobile): adiciona regra de variante da tela de empresa"
```

---

### Task 2: View model da tela enxuta

**Files:**
- Modify: `mobile/src/features/company/company-free-view.ts`
- Test: `mobile/src/features/company/company-free-view.test.ts`

- [x] **Step 1: Completar o teste que falha**

Substitua o conteúdo de `mobile/src/features/company/company-free-view.test.ts` por:

```ts
import { describe, expect, it } from 'vitest';

import type { Company } from '@/types/domain';

import { buildCompanyFreeView, companyDetailVariant } from './company-free-view';

function empresa(overrides: Partial<Company> & { _id: string }): Company {
  return {
    name: `Empresa ${overrides._id}`,
    slug: `empresa-${overrides._id}`,
    description: 'Descrição da empresa.',
    category: '1',
    ...overrides,
  };
}

const SEGUNDA_MEIO_DIA = new Date(2026, 10, 9, 12, 0, 0);
const SEGUNDA_NOITE = new Date(2026, 10, 9, 20, 0, 0);
const TERCA_MEIO_DIA = new Date(2026, 10, 10, 12, 0, 0);

describe('companyDetailVariant', () => {
  it('usa a tela completa para empresa em destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: true }))).toBe('full');
  });

  it('usa a tela enxuta para empresa sem destaque', () => {
    expect(companyDetailVariant(empresa({ _id: '1', isFeatured: false }))).toBe('free');
  });

  it('usa a tela enxuta quando isFeatured não está definido', () => {
    expect(companyDetailVariant(empresa({ _id: '1' }))).toBe('free');
  });
});

describe('buildCompanyFreeView', () => {
  it('usa a capa, cai para o logo e fica sem imagem quando não há nenhuma', () => {
    const comCapa = buildCompanyFreeView(
      empresa({ _id: '1', cover: 'capa.jpg', logo: 'logo.jpg' }),
      SEGUNDA_MEIO_DIA,
    );
    expect(comCapa.coverUrl).toBe('capa.jpg');

    const semCapa = buildCompanyFreeView(empresa({ _id: '1', logo: 'logo.jpg' }), SEGUNDA_MEIO_DIA);
    expect(semCapa.coverUrl).toBe('logo.jpg');

    const semImagem = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);
    expect(semImagem.coverUrl).toBeUndefined();
  });

  it('formata a categoria e usa fallback para descrição vazia', () => {
    const view = buildCompanyFreeView(
      empresa({ _id: '1', category: 'Padaria', description: '   ' }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.category).toBe('Padaria');
    expect(view.description).toBe('Informações em breve.');
  });

  it('combina cidade e endereço na linha de localização', () => {
    const view = buildCompanyFreeView(
      empresa({
        _id: '1',
        city: { _id: 'c1', name: 'Castelo do Piauí', slug: 'castelo', state: 'PI' },
        address: 'Rua A, 10',
      }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.addressLine).toBe('Castelo do Piauí • Rua A, 10');
  });

  it('calcula o status de funcionamento a partir do schedule', () => {
    const schedule = [{ day: 1, opens: 480, closes: 1080 }];

    const aberto = buildCompanyFreeView(empresa({ _id: '1', schedule }), SEGUNDA_MEIO_DIA);
    expect(aberto.status).toEqual({ kind: 'open', label: 'Aberto agora', tone: 'success' });

    const fechado = buildCompanyFreeView(empresa({ _id: '1', schedule }), SEGUNDA_NOITE);
    expect(fechado.status).toEqual({ kind: 'closed', label: 'Fechado agora', tone: 'error' });

    const desconhecido = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);
    expect(desconhecido.status).toEqual({ kind: 'unknown', label: 'Consulte', tone: 'muted' });
  });

  it('fecha em dia sem faixa mesmo quando o bucket da semana tem horário', () => {
    const schedule = [{ day: 1, opens: 480, closes: 1080 }];

    const view = buildCompanyFreeView(empresa({ _id: '1', schedule }), TERCA_MEIO_DIA);

    expect(view.status).toEqual({ kind: 'closed', label: 'Fechado agora', tone: 'error' });
  });

  it('marca as três linhas como consulta quando não há schedule', () => {
    const view = buildCompanyFreeView(empresa({ _id: '1' }), SEGUNDA_MEIO_DIA);

    expect(view.hoursRows).toEqual([
      { key: 'weekdays', label: 'Segunda à sexta', value: 'Consulte a empresa', closed: true },
      { key: 'saturday', label: 'Sábado', value: 'Consulte a empresa', closed: true },
      { key: 'sunday', label: 'Domingo', value: 'Consulte a empresa', closed: true },
    ]);
  });

  it('usa o nome da categoria quando ela vem populada', () => {
    const view = buildCompanyFreeView(
      empresa({ _id: '1', category: { _id: 'c1', name: 'Padaria', slug: 'padaria' } }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.category).toBe('Padaria');
  });

  it('monta as três linhas de horário e marca os dias fechados', () => {
    const view = buildCompanyFreeView(
      empresa({
        _id: '1',
        schedule: [
          { day: 1, opens: 480, closes: 1080 },
          { day: 2, opens: 480, closes: 1080 },
          { day: 3, opens: 480, closes: 1080 },
          { day: 4, opens: 480, closes: 1080 },
          { day: 5, opens: 480, closes: 1080 },
          { day: 6, opens: 480, closes: 720 },
        ],
      }),
      SEGUNDA_MEIO_DIA,
    );

    expect(view.hoursRows).toEqual([
      { key: 'weekdays', label: 'Segunda à sexta', value: '08h às 18h', closed: false },
      { key: 'saturday', label: 'Sábado', value: '08h às 12h', closed: false },
      { key: 'sunday', label: 'Domingo', value: 'Fechado', closed: true },
    ]);
  });

  it('expõe os contatos e sinaliza quando não há nenhum', () => {
    const comContato = buildCompanyFreeView(
      empresa({ _id: '1', phone: '86999999999', whatsapp: '86988888888' }),
      SEGUNDA_MEIO_DIA,
    );
    expect(comContato.phone).toBe('86999999999');
    expect(comContato.whatsapp).toBe('86988888888');
    expect(comContato.hasContact).toBe(true);

    const semContato = buildCompanyFreeView(
      empresa({ _id: '1', phone: null, whatsapp: null }),
      SEGUNDA_MEIO_DIA,
    );
    expect(semContato.phone).toBeUndefined();
    expect(semContato.whatsapp).toBeUndefined();
    expect(semContato.hasContact).toBe(false);
  });
});
```

- [x] **Step 2: Rodar o teste e ver falhar**

Em `mobile/`:

```bash
npm test -- src/features/company/company-free-view.test.ts
```

Esperado: FAIL — `buildCompanyFreeView` não é exportado.

- [x] **Step 3: Implementar o view model**

Substitua o conteúdo de `mobile/src/features/company/company-free-view.ts` por:

```ts
import type { Company } from '@/types/domain';

import type { WorkingHours } from './company-details';
import { buildCompanyDetails } from './company-details';
import { getOpeningStatus, isOpenNowFromSchedule } from './opening-hours';

export type CompanyDetailVariant = 'full' | 'free';

export type CompanyFreeStatusKind = 'open' | 'closed' | 'unknown';
export type CompanyFreeStatusTone = 'success' | 'error' | 'muted';

export type CompanyFreeStatus = {
  kind: CompanyFreeStatusKind;
  label: string;
  tone: CompanyFreeStatusTone;
};

export type CompanyFreeHoursRow = {
  key: keyof WorkingHours;
  label: string;
  value: string;
  closed: boolean;
};

export type CompanyFreeView = {
  id: string;
  name: string;
  coverUrl?: string;
  category: string;
  description: string;
  addressLine?: string;
  status: CompanyFreeStatus;
  hoursRows: CompanyFreeHoursRow[];
  phone?: string;
  whatsapp?: string;
  hasContact: boolean;
};

const EMPTY_DESCRIPTION = 'Informações em breve.';
const CLOSED_HOURS = 'Fechado';
const CONSULT_HOURS = 'Consulte';

const STATUS_LABELS: Record<
  CompanyFreeStatusKind,
  { label: string; tone: CompanyFreeStatusTone }
> = {
  open: { label: 'Aberto agora', tone: 'success' },
  closed: { label: 'Fechado agora', tone: 'error' },
  unknown: { label: 'Consulte', tone: 'muted' },
};

const HOURS_ROWS: readonly { key: keyof WorkingHours; label: string }[] = [
  { key: 'weekdays', label: 'Segunda à sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export function companyDetailVariant(company: Company): CompanyDetailVariant {
  return company.isFeatured === true ? 'full' : 'free';
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function buildStatus(
  company: Company,
  workingHours: WorkingHours,
  now: Date,
): CompanyFreeStatus {
  const fromSchedule = isOpenNowFromSchedule(company.schedule ?? [], now);
  const kind: CompanyFreeStatusKind =
    fromSchedule === null ? getOpeningStatus(workingHours, now) : fromSchedule ? 'open' : 'closed';
  const { label, tone } = STATUS_LABELS[kind];
  return { kind, label, tone };
}

function isClosedHours(value: string): boolean {
  return value === CLOSED_HOURS || value.toLowerCase().includes(CONSULT_HOURS.toLowerCase());
}

export function buildCompanyFreeView(company: Company, now: Date): CompanyFreeView {
  const details = buildCompanyDetails(company);
  const description = normalizeText(company.description) || EMPTY_DESCRIPTION;
  const addressLine = [details.city, details.address].filter(Boolean).join(' • ') || undefined;
  const phone = company.phone ?? undefined;
  const whatsapp = company.whatsapp ?? undefined;

  return {
    id: details.id,
    name: details.name,
    coverUrl: company.cover || company.logo || undefined,
    category: details.category,
    description,
    addressLine,
    status: buildStatus(company, details.workingHours, now),
    hoursRows: HOURS_ROWS.map((row) => {
      const value = details.workingHours[row.key];
      return { ...row, value, closed: isClosedHours(value) };
    }),
    phone,
    whatsapp,
    hasContact: Boolean(phone || whatsapp),
  };
}
```

- [x] **Step 4: Rodar o teste e ver passar**

Em `mobile/`:

```bash
npm test -- src/features/company/company-free-view.test.ts
```

Esperado: PASS — 12 testes.

- [ ] **Step 5: Commit (somente com autorização explícita)**

```bash
git add mobile/src/features/company/company-free-view.ts mobile/src/features/company/company-free-view.test.ts
git commit -m "feat(mobile): monta view model da tela de empresa gratuita"
```

---

### Task 3: Componente visual `CompanyFreeDetailScreen`

**Files:**
- Modify: `mobile/src/constants/theme.ts`
- Create: `mobile/src/features/company/company-free-detail-screen.tsx`

- [x] **Step 0: Adicionar o token de cor dos botões**

Em `mobile/src/constants/theme.ts`, logo após `ButtonGradients`, adicione:

```ts
/** Cores de texto/ícone sobre os gradientes dos botões de contato. */
export const ButtonTextColors = {
  whatsapp: '#FFFFFF',
  call: '#121212',
} as const;
```

- [x] **Step 1: Criar o componente**

Crie `mobile/src/features/company/company-free-detail-screen.tsx`:

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ButtonGradients,
  ButtonTextColors,
  CardShadow,
  FontFamily,
  FontWeight,
  Overlays,
  Radius,
  Spacing,
  Type,
  Typography,
} from '@/constants/theme';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import type { Company } from '@/types/domain';
import { callPhone, openWhatsApp } from '@/utils/links';

import type { CompanyFreeView } from './company-free-view';
import { buildCompanyFreeView } from './company-free-view';

const IMAGE_HEIGHT = 220;
const ICON_BUTTON_SIZE = 44;
const WHATSAPP_MESSAGE =
  'Olá, vi sua empresa no aplicativo *Guia de Castelo do Piauí* e gostaria de mais informações!';

function statusColor(
  tone: CompanyFreeView['status']['tone'],
  colors: ReturnType<typeof useThemeColors>,
): string {
  if (tone === 'success') return colors.success;
  if (tone === 'error') return colors.error;
  return colors.textSecondary;
}

export function CompanyFreeDetailScreen({ company }: { company: Company }) {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const view = buildCompanyFreeView(company, new Date());
  const favorite = isFavorite(company._id);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function handleToggleFavorite() {
    toggleFavorite(company);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.six * 2 },
        ]}
      >
        <View style={styles.imageWrapper}>
          {view.coverUrl ? (
            <Image
              source={{ uri: view.coverUrl }}
              style={styles.cover}
              contentFit="cover"
              transition={250}
              accessibilityRole="image"
              accessibilityLabel={`Foto de ${view.name}`}
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <MaterialCommunityIcons
                name="storefront-outline"
                size={48}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>

        <View style={styles.basicInfo}>
          <Text style={styles.companyName}>{view.name}</Text>

          <Text style={[styles.statusText, { color: statusColor(view.status.tone, colors) }]}>
            Horário de Atendimento: {view.status.label}
          </Text>

          <Text style={styles.categoryText}>Categoria: {view.category}</Text>

          {view.addressLine ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.addressText}>{view.addressLine}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.descriptionTitle}>Nossa Descrição (Simplificada)</Text>
          <Text style={styles.descriptionText} numberOfLines={4}>
            {view.description}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursTitle}>Horário de Funcionamento</Text>

            {view.hoursRows.map((row, index) => (
              <View
                key={row.key}
                style={[styles.hoursRow, index < view.hoursRows.length - 1 && styles.hoursDivider]}
              >
                <Text style={styles.hoursLabel}>{row.label}</Text>
                <Text style={[styles.hoursValue, row.closed && styles.hoursClosed]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.floatingNav, { top: insets.top + Spacing.two }]}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            favorite && styles.favoriteActive,
            pressed && styles.pressed,
          ]}
          onPress={handleToggleFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          accessibilityState={{ selected: favorite }}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={21}
            color={favorite ? colors.background : colors.text}
          />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {!view.hasContact ? <ContactHintRow /> : null}

        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.whatsappButton,
              !view.whatsapp && styles.buttonDisabled,
              pressed && view.whatsapp ? styles.pressed : null,
            ]}
            onPress={() => {
              if (view.whatsapp) void openWhatsApp(view.whatsapp, WHATSAPP_MESSAGE);
            }}
            disabled={!view.whatsapp}
            accessibilityRole="button"
            accessibilityLabel="Falar no WhatsApp"
            accessibilityState={{ disabled: !view.whatsapp }}
          >
            {view.whatsapp ? (
              <LinearGradient
                colors={ButtonGradients.whatsapp}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <MaterialCommunityIcons
              name="whatsapp"
              size={20}
              color={view.whatsapp ? ButtonTextColors.whatsapp : colors.textSecondary}
            />
            <Text
              maxFontSizeMultiplier={1.4}
              style={[styles.whatsappButtonText, !view.whatsapp && styles.buttonDisabledText]}
            >
              WhatsApp
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.callButton,
              !view.phone && styles.buttonDisabled,
              pressed && view.phone ? styles.pressed : null,
            ]}
            onPress={() => {
              if (view.phone) void callPhone(view.phone);
            }}
            disabled={!view.phone}
            accessibilityRole="button"
            accessibilityLabel="Ligar para a empresa"
            accessibilityState={{ disabled: !view.phone }}
          >
            {view.phone ? (
              <LinearGradient
                colors={ButtonGradients.call}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <Ionicons
              name="call"
              size={18}
              color={view.phone ? ButtonTextColors.call : colors.textSecondary}
            />
            <Text
              maxFontSizeMultiplier={1.4}
              style={[styles.callButtonText, !view.phone && styles.buttonDisabledText]}
            >
              Ligar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingTop: 0,
    },
    imageWrapper: {
      marginHorizontal: Spacing.three,
      marginTop: Spacing.three,
      marginBottom: Spacing.three,
    },
    cover: {
      width: '100%',
      height: IMAGE_HEIGHT,
      borderRadius: Radius.card,
      backgroundColor: colors.coverPlaceholder,
    },
    coverPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    basicInfo: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.two,
      marginBottom: Spacing.three,
    },
    companyName: {
      color: colors.text,
      ...Typography.h2,
      fontFamily: FontFamily.heading800,
      fontWeight: FontWeight.heavy,
      letterSpacing: -0.3,
    },
    statusText: {
      fontFamily: FontFamily.body600,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.semibold,
    },
    categoryText: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    addressText: {
      flex: 1,
      color: colors.textSecondary,
      ...Typography.body,
    },
    section: {
      marginHorizontal: Spacing.three,
      marginBottom: Spacing.four,
    },
    descriptionTitle: {
      color: colors.primary,
      ...Typography.h4,
      fontFamily: FontFamily.heading600,
      fontWeight: FontWeight.semibold,
      marginBottom: Spacing.two,
    },
    descriptionText: {
      color: colors.text,
      ...Typography.body,
    },
    hoursCard: {
      ...CardShadow,
      padding: Spacing.three,
      backgroundColor: colors.surface,
      borderRadius: Radius.detailCard,
      borderWidth: 0.5,
      borderColor: Overlays.goldBorder,
    },
    hoursTitle: {
      color: colors.text,
      fontFamily: FontFamily.heading600,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.semibold,
      marginBottom: Spacing.two,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.three,
      paddingVertical: Spacing.two,
    },
    hoursDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: Overlays.hairline,
    },
    hoursLabel: {
      color: colors.textSoft,
      fontFamily: FontFamily.body500,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.medium,
    },
    hoursValue: {
      flexShrink: 1,
      color: colors.primary,
      ...Typography.bodyBold,
      textAlign: 'right',
    },
    hoursClosed: {
      color: colors.textSecondary,
      fontFamily: FontFamily.body500,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.medium,
    },
    floatingNav: {
      position: 'absolute',
      left: Spacing.three,
      right: Spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      borderRadius: ICON_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    favoriteActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pressed: {
      opacity: 0.8,
    },
    footer: {
      ...CardShadow,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.three,
      gap: Spacing.two,
      elevation: 16,
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
    },
    footerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    whatsappButton: {
      flex: 1,
      height: 50,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      overflow: 'hidden',
      backgroundColor: colors.whatsapp,
    },
    whatsappButtonText: {
      color: ButtonTextColors.whatsapp,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    callButton: {
      flex: 1,
      height: 50,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    callButtonText: {
      color: ButtonTextColors.call,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    buttonDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
    },
    buttonDisabledText: {
      color: colors.textSecondary,
    },
  });
}
```

- [x] **Step 2: Rodar typecheck**

Em `mobile/`:

```bash
npm run typecheck
```

Esperado: PASS (sem erros).

- [x] **Step 3: Rodar lint**

Em `mobile/`:

```bash
npm run lint
```

Esperado: PASS (sem erros).

- [ ] **Step 4: Commit (somente com autorização explícita)**

```bash
git add mobile/src/features/company/company-free-detail-screen.tsx
git commit -m "feat(mobile): adiciona tela enxuta de empresa gratuita"
```

---

### Task 4: Branch na tela de detalhes

**Files:**
- Modify: `mobile/src/features/company/company-detail-screen.tsx`

- [x] **Step 1: Adicionar o import**

No bloco de imports locais de `company-detail-screen.tsx`, adicione antes de `CompanyGallery`:

```tsx
import { CompanyFreeDetailScreen } from './company-free-detail-screen';
import { companyDetailVariant } from './company-free-view';
```

- [x] **Step 2: Garantir o narrowing de `company`**

Troque:

```tsx
  if (!details) {
```

por:

```tsx
  if (!company || !details) {
```

- [x] **Step 3: Adicionar o branch após o bloco de erro**

Logo depois do fechamento do `if (!company || !details) { ... }`, adicione:

```tsx
  if (companyDetailVariant(company) === 'free') {
    return <CompanyFreeDetailScreen company={company} />;
  }
```

O trecho deve ficar assim:

```tsx
  if (!company || !details) {
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.primary} />
        <Text style={styles.stateText}>{error ?? 'Empresa não encontrada.'}</Text>
        <Pressable style={styles.stateButton} onPress={goBack} accessibilityRole="button">
          <Text style={styles.stateButtonText}>Voltar para a Home</Text>
        </Pressable>
      </View>
    );
  }

  if (companyDetailVariant(company) === 'free') {
    return <CompanyFreeDetailScreen company={company} />;
  }

  const hasContact = Boolean(details.whatsapp || details.phone);
```

- [x] **Step 4: Rodar o gate completo**

Em `mobile/`:

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: typecheck e lint PASS; os testes novos PASS. `src/constants/theme.test.ts` continua com a falha pré-existente de `Type.xs` (12/16 esperado vs 11/15 na largura atual), fora do escopo desta feature.

- [ ] **Step 5: Commit (somente com autorização explícita)**

```bash
git add mobile/src/features/company/company-detail-screen.tsx
git commit -m "feat(mobile): abre tela enxuta para empresa sem destaque"
```

---

### Task 5: Verificação de bundle e smoke test manual

**Files:**
- Nenhum arquivo novo.

- [x] **Step 1: Provar que o app bundleia**

Em `mobile/`:

```bash
npx expo export --platform web --output-dir /tmp/opencode/guia-export-free-details
```

Esperado: export concluído sem erros.

- [x] **Step 2: Smoke test manual**

Com `npx expo start`:

1. Abrir uma empresa com `isFeatured: true` (ex.: “Empresa em Destaque” da Home) e confirmar que a tela completa atual continua abrindo.
2. Abrir uma empresa sem destaque (ex.: card de “Outras empresas” ou resultado da busca) e confirmar:
   - foto única com cantos arredondados;
   - nome, status colorido, categoria e endereço;
   - descrição simplificada com no máximo 4 linhas;
   - card de horários com 3 linhas;
   - WhatsApp e Ligar funcionando;
   - coração alterna o favorito;
   - voltar retorna à tela anterior.
3. Abrir uma empresa sem telefone/WhatsApp e confirmar que os botões ficam desabilitados e o `ContactHintRow` aparece.

- [x] **Step 3: Nenhum commit nesta task**

Verificação apenas; não altera arquivos.

---

## Self-review do plano

**Cobertura da spec:**
- Regra `isFeatured !== true` → Task 1.
- Foto única, categoria, descrição, endereço, status, horários e contato → Task 2 (view model) + Task 3 (UI).
- Header com voltar/favoritar e rodapé fixo → Task 3.
- Sem galeria/carrossel/história/serviços → Task 3 (componente não renderiza esses blocos).
- Tokens do theme → Task 3 (usa `useThemeColors`, `Typography`, `Spacing`, `Radius`).
- Branch após fetch na rota única → Task 4.
- Testes e gate → Tasks 1, 2 e 4; bundle → Task 5.

**Placeholders:** nenhum “TBD”, “TODO” ou “implementar depois”.

**Consistência de tipos:** `CompanyDetailVariant`, `CompanyFreeView`, `buildCompanyFreeView`, `companyDetailVariant` e `CompanyFreeDetailScreen` são usados com os mesmos nomes em todas as tasks.
