# Especificação Refinada — Novas Funcionalidades da Home

> Refinamento da spec do outro dev (`especificacao_novas_funcionalidades_md.md`),
> cruzada com o estado atual do app (roadmap + código). A spec original era
> pobre em detalhes (sem modelo de dados, API, auth, validação, estados de
> loading/erro, acessibilidade e testes). Esta versão preenche essas lacunas.

## 1. Análise de conflitos com o estado atual

| Item da spec original | Estado atual | Conflito? |
|---|---|---|
| "Outras Empresas" (listagem gratuita) | `Company.isFeatured` já diferencia destaque vs. resto; busca lista todas. | Não conflita. Reaproveita `isFeatured=false`. |
| "Mural de Avisos" | Existe "Dicas & Utilidade Pública" (atalhos) + push notifications (campanhas). | Parcial: mural é um quadro persistente; push é alerta. Complementares, mas precisam de entidade `Notice`. |
| "Profissionais Autônomos" | ✅ Implementado como entidade dedicada `AutonomousProfessional` (decisão: abordagem B). | Resolvido — não mais conflito. |
| "Botão Compartilhar" | ✅ Já implementado (`shareCompany` em `utils/links.ts`, usado no detalhe). | Redundante — não refazer. |
| Hierarquia da Home | Atual: Header → Busca → Convidado → Categorias → Destaque → Utilidade → Vagas → CTA. | Reordenação aceitável. Transporte Público removido (decisão do mantenedor). |

## 2. Funcionalidades refinadas

### 2.1 "Outras Empresas & Serviços Locais" (PENDENTE)

- **Dados:** reutiliza `Company` com `isFeatured === false`. Sem nova entidade.
- **API:** `GET /companies?featured=false&page=&pageSize=` (backend já suporta `featured`).
- **Mobile:** seção na Home abaixo de "Empresas em Destaque"; lista vertical compacta (logo 40x40, nome bold 14px, categoria + endereço, ação rápida WhatsApp/chevron).
- **Estados:** loading (skeleton), vazio ("Nenhuma empresa cadastrada"), erro.
- **A11y:** `accessibilityLabel` por card; `accessibilityRole="button"`.
- **Não inclui** badge "Destaque" nem galeria expansível (conforme spec).

### 2.2 Mural de Avisos & Comunicados Locais (PENDENTE)

- **Dados:** nova entidade `Notice { _id, title, body, type: 'general'|'alert'|'health', startsAt, expiresAt, active }`.
- **API:** `GET /notices?active=true` (público), `POST/PUT/DELETE /notices` (admin, auth).
- **Mobile:** carrossel horizontal entre "Telefones Úteis" e "Oportunidades"; card com borda lateral colorida (amarelo/vermelho/verde); toque abre modal com texto completo.
- **Estados:** loading, vazio ("Sem avisos no momento"), expiração automática por `expiresAt`.
- **Relação com push:** push = alerta imediato; mural = referência persistente. Complementares.

### 2.3 Guia de Profissionais Autônomos (✅ IMPLEMENTADO)

- **Dados:** entidade dedicada `AutonomousProfessional` (name, slug, specialty, description, phone, whatsapp, photo, city, rating, ratingCount, ownerClerkId).
- **API:** `GET /autonomous-professionals`, `GET/POST/PUT/DELETE /autonomous-professionals/:id` (auth + ownership).
- **Mobile:** seção "Profissionais Independentes" na Home + tela de detalhe `app/autonomous/[id].tsx`.
- **Status:** concluído (branch merged em master).

### 2.4 Botão de Compartilhar Empresa (✅ IMPLEMENTADO)

- `shareCompany` em `utils/links.ts`, usado em `company/[id].tsx` via `handleAction('share')`. Nenhuma ação necessária.

### 2.5 Hierarquia da Home (proposta)

1. Header / Localização
2. Barra de Pesquisa
3. Banner Informativo (Convidado)
4. Categorias Rápidas (Transporte Público removido)
5. ⭐ Empresas em Destaque
6. 🏪 Outras Empresas (listagem gratuita) *(pendente)*
7. 🔥 Promoções da Semana / Banners
8. 📞 Telefones Úteis & Serviços
9. 📢 Mural de Avisos Úteis *(pendente)*
10. 🧰 Profissionais Autônomos ✅
11. 💼 Oportunidades na Cidade
12. Rodapé (Anuncie Conosco)

## 3. Abordagens (decisões)

### 3.1 Profissionais Autônomos — ✅ Decisão: entidade dedicada (B)
- Implementado como `AutonomousProfessional` (não reutiliza `Company`).

### 3.2 Mural de Avisos — nova entidade vs. reuso de Banner

- **A (recomendada):** entidade `Notice` dedicada (título, corpo, tipo, validade). Banners são visuais/promocionais; avisos são textuais/informativos. Semânticas diferentes.
- **B:** reusar `Banner` com `type: 'notice'`. Menos código, mas mistura conceitos.

### 3.3 "Outras Empresas" — seção separada vs. filtro na busca

- **A (recomendada):** seção separada na Home. Dá visibilidade aos gratuitos.
- **B:** apenas filtro "Não destacadas" na busca. Menos UI, mas menos visibilidade.

## 4. Constraints

- TypeScript strict; sem `any`.
- Sem `console.log` em código entregue.
- Lint + typecheck verdes.
- Backend tests com supertest contra `app.ts`.
- Mobile: lint + typecheck + export web.
- Tipos de domínio sincronizados (shared + mobile + admin).
- Autorização: mutations exigem auth + ownership (admin ou dono).

## 5. O que fica para o builder decidir

- Upload de foto de perfil do profissional (recomendo URL no MVP).
- Moderação de avisos (admin aprova antes de publicar?).
- Limite de avisos ativos simultaneamente.