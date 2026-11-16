# Spec — Migração multi-cidade (Guia Comercial)

## Contexto
Hoje o app está acoplado a uma única cidade (`Castelo do Piauí`). Esta spec mapeia os pontos de acoplamento e o fluxo de migração para suportar múltiplas cidades.

## Grep results

### 1. Ocorrências de "Castelo do Piauí"
- backend: `src/services/user.service.ts:127` (default cidade), `src/services/company.service.ts:119` (resolve cidade ou default), `src/scripts/seed.ts` (dados de seed).
- mobile: `src/data/mock.ts`, `src/features/home/header.tsx:14` (fallback de exibição), `src/features/company/company-detail-screen.tsx:46` (mensagem WhatsApp), `src/features/search/search-pagination.ts` (normalização).
- Testes referenciam a cidade como fixture.

### 2. Cidade default
- Backend: `user.service.ts` define default = Castelo do Piauí (primeira cidade do MVP).
- Mobile: `header.tsx` exibe `city ?? 'Castelo do Piauí'`.

### 3. Chave de persistência
- Não existe persistência dedicada de cidade selecionada no momento (estado em memória em `index.tsx` via `useState`). Migração deve introduzir chave AsyncStorage, ex.: `@guia:selectedCitySlug`.

### 4. Fluxo GPS ("Perto de mim")
- `search.tsx`: `Location.requestForegroundPermissionsAsync()` → `getCurrentPositionAsync` → `reverseGeocodeAsync` → define `nearMeCity`.
- Fallback: se permissão negada ou erro, manter lista sem filtro de proximidade e exibir mensagem.

### 5. Fallback
- Header exibe nome da cidade ou default.
- Serviço mobile sempre tem fallback mock quando backend indisponível.
- Busca: mensagem "Nenhuma empresa encontrada perto de X".

## Plano de migração (alto nível)
1. Introduzir persistência da cidade selecionada (AsyncStorage).
2. Remover hardcode de default em `header.tsx` e `user.service.ts` (usar cidade do perfil / primeira da lista).
3. Generalizar mocks e seeds para múltiplas cidades.
4. Manter fluxo GPS com fallback gracioso.
5. Atualizar testes de regressão.

## Riscos
- Metro/Vite não resolvem cross-project; manter cópias de `domain.ts` sincronizadas.
- Breaking change em contratos de API se `city` virar obrigatório.
