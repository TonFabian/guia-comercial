# Levantamento — Funcionalidades apenas no frontend (sem lógica implementada)

> Documento gerado via análise de código + navegação no app (Playwright,
> localhost:8081). Lista funcionalidades expostas na UI cuja lógica de negócio
> ainda não está implementada, para priorização.

## 1. Funcionalidades com "Em breve" / placeholder

| Funcionalidade | Local | Comportamento atual |
|---|---|---|
| Meus dados | `app/(tabs)/profile.tsx` | Alert "Em breve" |
| Minha empresa | `app/(tabs)/profile.tsx` | Alert "Em breve" |
| Configurações | `app/(tabs)/profile.tsx` | Alert "Em breve" |
| Ver Vaga (detalhe) | `features/home/job-list.tsx` | Alert "Detalhes da vaga em breve" |
| Anuncie no Guia (CTA) | `features/home/announce-cta.tsx` | `comingSoon` → Alert "Integração em breve" |
| Busca por voz | `features/home/search-bar.tsx` | Botão de microfone sem `onPress` (sem ação) |

## 2. Funcionalidades frontend-only (sem backend)

| Funcionalidade | Fonte de dados | Observação |
|---|---|---|
| Telefones Úteis & Serviços (Utilidade Pública) | `data/public-utilities.ts` (mock) | Sem rota no backend. Modal exibe nome+descrição apenas. |
| Cupons | Desativado (`SHOW_COUPONS = false`) | Backend existe (`/coupons`), mas a seção está desligada na home. |
| Turismo / Eventos | Não existe ainda | Ideia para v1.1+ (ver design doc). |

## 3. Funcionalidades parcialmente implementadas

| Funcionalidade | O que funciona | O que falta |
|---|---|---|
| Busca | Lista + filtro por categoria + debounce | Busca por voz; filtros avançados (aberto agora, perto de mim); paginação no mobile (backend já pagina). |
| Favoritos | Persistido em AsyncStorage | Sincronização com conta (backend `/me` não armazena favoritos). |
| Avaliações | Exibe nota e contagem | Criar avaliação, foto, resposta do dono (backend não tem rota de reviews). |
| Compartilhar empresa | `Share.share` nativo | Compartilhamento formatado com link/QR. |
| Site/Instagram/Facebook no detalhe | `openExternalUrl` abre link | Validação de URL e fallback quando ausente (já oculta botão se sem valor). |

## 4. Admin (painel) — totalmente não implementado

`admin/src/App.tsx` é apenas um scaffold ("Estrutura inicial"). Todos os
endpoints em `admin/src/services/api.ts` lançam `NOT_IMPLEMENTED`. Telas de
CRUD de empresas, categorias, banners, cupons, vagas e usuários não existem.

## 5. Backend — rotas existentes mas sem consumo no mobile

- `/banners` — mobile consome (`getBanners`), mas sem tela de gestão.
- `/coupons` — mobile tem `getCoupons` mas a seção está desativada.
- `/jobs` — mobile consome (`getJobs`), detalhe de vaga não implementado.
- `/me` — mobile não consome (perfil usa dados do Clerk direto).

## 6. Mocks em produção (corrigido)

Antes desta análise, mocks eram usados como fallback em produção (rede fora do
ar ou API vazia). Corrigido: mocks agora só em `__DEV__` ou quando
`!isApiConfigured()`. Em produção, falha de rede/API resulta em lista vazia.

## 7. Recomendação de prioridade

**P0 (bloqueia MVP):**
- Implementar "Meus dados" (editar perfil via Clerk).
- Implementar detalhe de vaga (ou remover o botão "Ver Vaga").
- Implementar ou remover "Anuncie no Guia" (substituir `comingSoon` por link
  real ou formulário de contato).

**P1 (melhora experiência):**
- Paginação/infinite scroll no mobile (backend já suporta).
- Filtro "aberto agora" e "perto de mim" na busca.
- Ativar seção de Cupons (quando houver anunciantes).
- Busca por voz (mic button).

**P2 (pós-MVP):**
- Painel admin (CRUD completo).
- Sincronização de favoritos com backend.
- Avaliações com foto e resposta do dono.
- Módulo de Turismo.