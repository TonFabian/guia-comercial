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
| "Profissionais Autônomos" | Categoria "Serviços" existe; sem entidade dedicada. | Conflito de modelagem: nova entidade vs. flag/categoria em `Company`. |
| "Botão Compartilhar" | **Já implementado** (`shareCompany` em `utils/links.ts`, usado no detalhe). | Redundante — não refazer. |
| Hierarquia da Home | Atual: Header → Busca → Convidado → Categorias → Destaque → Utilidade → Vagas → CTA. | Reordenação aceitável, mas "Sem Transporte Público" contradiz o atalho "Ônibus e Transporte" existente (manter). |

## 2. Funcionalidades refinadas

### 2.1 "Outras Empresas & Serviços Locais"

- **Dados:** reutiliza `Company` com `isFeatured === false`. Sem nova entidade.
- **API:** `GET /companies?featured=false&page=&pageSize=` (backend já suporta `featured`).
- **Mobile:** seção na Home abaixo de "Empresas em Destaque"; lista vertical compacta (logo 40x40, nome bold 14px, categoria + endereço, ação rápida WhatsApp/chevron).
- **Estados:** loading (skeleton), vazio ("Nenhuma empresa cadastrada"), erro.
- **A11y:** `accessibilityLabel` por card; `accessibilityRole="button"`.
- **Não inclui** badge "Destaque" nem galeria expansível (conforme spec).

### 2.2 Mural de Avisos & Comunicados Locais

- **Dados:** nova entidade `Notice { _id, title, body, type: 'general'|'alert'|'health', startsAt, expiresAt, active }`.
- **API:** `GET /notices?active=true` (público), `POST/PUT/DELETE /notices` (admin, auth).
- **Mobile:** carrossel horizontal entre "Telefones Úteis" e "Oportunidades"; card com borda lateral colorida (amarelo/vermelho/verde); toque abre modal com texto completo.
- **Estados:** loading, vazio ("Sem avisos no momento"), expiração automática por `expiresAt`.
- **Relação com push:** push = alerta imediato; mural = referência persistente. Complementares.

### 2.3 Guia de Profissionais Autônomos

- **Dados:** reutiliza `Company` com `isAutonomous: boolean` (novo campo) e categoria "Autônomos" (novo slug). Sem nova entidade (evita duplicação de CRUD, busca, favoritos).
- **API:** `GET /companies?autonomous=true` (filtro no backend) ou filtro client-side por `isAutonomous`.
- **Mobile:** chip `[🧰 Autônomos]` na busca + seção dedicada na Home com cards compactos (foto circular, nome, especialidade, botão WhatsApp).
- **Estados:** vazio, loading.

### 2.4 Botão de Compartilhar Empresa

- **Status:** ✅ já implementado (`shareCompany` em `utils/links.ts`, usado em `company/[id].tsx` via `handleAction('share')`). Nenhuma ação necessária.

### 2.5 Hierarquia da Home (proposta)

1. Header / Localização
2. Barra de Pesquisa
3. Banner Informativo (Convidado)
4. Categorias Rápidas (manter "Transporte Público" — já existe como atalho)
5. ⭐ Empresas em Destaque
6. 🏪 Outras Empresas (listagem gratuita)
7. 🔥 Promoções da Semana / Banners
8. 📞 Telefones Úteis & Serviços
9. 📢 Mural de Avisos Úteis
10. 🧰 Profissionais Autônomos
11. 💼 Oportunidades na Cidade
12. Rodapé (Anuncie Conosco)

## 3. Abordagens (decisão pendente)

### 3.1 Profissionais Autônomos — nova entidade vs. flag em Company

- **A (recomendada):** flag `isAutonomous` + categoria "Autônomos" em `Company`. Reaproveita busca, favoritos, detalhe, admin CRUD. Menos código.
- **B:** entidade dedicada `AutonomousProfessional`. Mais campos específicos (especialidade, foto), mas duplica CRUD, busca, favoritos, detalhe.

### 3.2 Mural de Avisos — nova entidade vs. reuso de Banner

- **A (recomendada):** entidade `Notice` dedicada (título, corpo, tipo, validade). Banners são visuais/promocionais; avisos são textuais/informativos. Semânticas diferentes.
- **B:** reusar `Banner` com `type: 'notice'`. Menos código, mas mistura conceitos.

### 3.3 "Outras Empresas" — seção separada vs. filtro na busca

- **A (recomendada):** seção separada na Home (como a spec original). Dá visibilidade aos gratuitos.
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