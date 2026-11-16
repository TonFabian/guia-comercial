# Detalhes de empresa gratuita (não destaque) — Design

Data: 2026-11-08

## Intent

Diferenciar a experiência de detalhes entre empresas em destaque e empresas
do plano gratuito/padrão. Empresas com `isFeatured === true` continuam na tela
completa (`CompanyDetailScreen`). Empresas sem destaque (`isFeatured !== true`)
passam a abrir uma tela enxuta, focada em foto única, informações básicas,
descrição curta, horários resumidos e contato rápido.

## Goals

- Uma única rota `/company/[id]`: busca a empresa uma vez e decide o layout
  após o fetch.
- Tela enxuta sem galeria, carrossel, "A Nossa História" ou lista de serviços.
- Foto única de capa, nome, status de funcionamento, categoria, endereço,
  descrição simplificada e horários resumidos.
- Rodapé fixo com WhatsApp e Ligar, com fallback quando não há contato.
- Favoritar e voltar no header, reutilizando o padrão visual atual.
- Visual com tokens do theme (dark/light), sem hex/tamanhos crus.

## Non-goals

- Criar campo `plan` no domínio/backend/admin. A regra usa apenas `isFeatured`.
- Refatorar o shim de rota existente (`app/company/[id].tsx`) ou a tela
  completa além do branch necessário.
- Testes de componente React Native (o repo não usa RNTL).
- Alterar a tela completa de empresas em destaque.

## Decisões

| Tema | Decisão |
| --- | --- |
| Regra de loja gratuita | `isFeatured !== true` |
| Navegação | Uma rota, branch após o fetch |
| Local do branch | `CompanyDetailScreen`, depois de montar `details` |
| Visual | `useThemeColors`, `Typography`, `Spacing`, `Radius`; dourado = `colors.primary` |
| Status | `getOpeningStatus` existente → Aberto agora / Fechado agora / Consulte |
| Horários | `buildCompanyDetails(company).workingHours` (3 linhas) |
| Contato | `openWhatsApp` / `callPhone`; botões desabilitados + `ContactHintRow` |
| Favoritos | `useFavorites` (AsyncStorage/backend já existentes) |
| Imagem | `expo-image`, `contentFit="cover"`, capa com fallback para logo |

## Arquitetura

```
app/company/[id].tsx
  └─ CompanyDetailScreen (fetch via useCompanyDetail)
       ├─ isFeatured === true  → layout completo atual
       └─ isFeatured !== true  → CompanyFreeDetailScreen
                                   └─ buildCompanyFreeView(company, now)
```

Arquivos:

- **Novo** `mobile/src/features/company/company-free-view.ts`
  - `companyDetailVariant(company): 'full' | 'free'`
  - `buildCompanyFreeView(company, now): CompanyFreeView`
- **Novo** `mobile/src/features/company/company-free-view.test.ts`
- **Novo** `mobile/src/features/company/company-free-detail-screen.tsx`
- **Editar** `mobile/src/features/company/company-detail-screen.tsx`
  - após `details`, renderizar a tela enxuta quando `!details.isFeatured`.

Sem mudanças em `shared/`, `backend/` ou `admin/`.

## View model

```ts
type CompanyFreeView = {
  id: string;
  name: string;
  coverUrl?: string;        // company.cover || company.logo
  category: string;         // categoryLabel()
  description: string;      // company.description || 'Informações em breve.'
  addressLine?: string;     // [cidade, endereço].filter(Boolean).join(' • ')
  status: {
    kind: 'open' | 'closed' | 'unknown';
    label: string;
    tone: 'success' | 'error' | 'muted';
  };
  hoursRows: {
    key: 'weekdays' | 'saturday' | 'sunday';
    label: string;
    value: string;
    closed: boolean;
  }[];
  phone?: string;
  whatsapp?: string;
  hasContact: boolean;
};
```

Regras:

- `companyDetailVariant`: `isFeatured === true` → `'full'`; qualquer outro
  valor (incluindo `undefined`) → `'free'`.
- `coverUrl`: `company.cover || company.logo || undefined`.
- `description`: texto aparado; vazio → `'Informações em breve.'`.
- `addressLine`: cidade via `cityName(company.city)` + `company.address`.
- `status`: `getOpeningStatus(workingHours, now)`; `open` → `success`,
  `closed` → `error`, `unknown` → `muted`; rótulos "Aberto agora",
  "Fechado agora", "Consulte".
- `hoursRows`: Segunda à sexta / Sábado / Domingo; `closed` quando o valor é
  "Fechado" ou contém "Consulte".
- `hasContact`: `Boolean(phone || whatsapp)`.

## UI

- **Header flutuante** (back + coração) sobre a foto, com
  `useSafeAreaInsets`, seguindo o padrão da tela completa.
- **Foto única**: `expo-image`, altura 220, `borderRadius: Radius.card`,
  `marginHorizontal: Spacing.three`, `contentFit="cover"`; sem foto usa
  placeholder com ícone.
- **Nome**: `Typography.h2` + `FontFamily.heading800`.
- **Status**: linha "Horário de Atendimento: {label}" com cor do tom.
- **Categoria**: "Categoria: {category}" em `colors.textSecondary`.
- **Endereço**: `addressLine` com ícone de localização.
- **Descrição**: título "Nossa Descrição (Simplificada)" em `colors.primary`;
  texto com `numberOfLines={4}`.
- **Horários**: card em `colors.surface` com as 3 linhas.
- **Rodapé fixo**: WhatsApp (gradiente `ButtonGradients.whatsapp`, texto
  branco) + Ligar (gradiente `ButtonGradients.call`, texto escuro); ambos
  desabilitados quando o contato correspondente falta, com `ContactHintRow`.
- **Removidos**: galeria, carrossel, "A Nossa História" e serviços.

## Testes (TDD)

1. Escrever `company-free-view.test.ts` e ver falhar.
2. Casos:
   - `companyDetailVariant` → `'full'` para `isFeatured: true`; `'free'` para
     `false` e `undefined`.
   - `buildCompanyFreeView`:
     - capa usa `cover`; sem cover usa `logo`; sem ambos fica indefinida.
     - categoria formatada por `categoryLabel`.
     - descrição vazia cai no fallback.
     - `addressLine` combina cidade e endereço.
     - status aberto/fechado/desconhecido com `now` fixo.
     - `hoursRows` reflete `workingHours` e marca fechados.
     - `hasContact` e telefones/WhatsApp.
3. Implementar o view model até os testes passarem.
4. Implementar a UI e o branch na tela completa.

## Verificação

- `npm test` em `mobile/`
- `npm run lint` em `mobile/`
- `npm run typecheck` em `mobile/`
- `npx expo export` para provar que o app bundleia

Gate dos outros apps não se aplica (escopo estritamente mobile).

## Riscos

- Empresas antigas sem `isFeatured` caem na tela enxuta (comportamento
  desejado pela regra).
- A UI não tem teste de componente; a lógica fica coberta pelos testes puros.
- O shim de rota atual permanece; não será refatorado neste escopo.

## Critério de sucesso

- Empresa em destaque continua abrindo a tela completa.
- Empresa sem destaque abre a tela enxuta com foto única, status, descrição,
  horários e botões de contato.
- Nenhum hex/tamanho cru fora do theme.
- `npm test`, `npm run lint` e `npm run typecheck` verdes no mobile.
