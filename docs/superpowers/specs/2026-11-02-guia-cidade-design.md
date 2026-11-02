# Guia da Cidade — Design e Escopo

> Documento gerado a partir de análise do app em execução (localhost:8081) e
> revisão de código. Serve como base para definir o escopo e priorizar o
> backlog.

## 1. Visão do produto

Aplicativo de **guia da cidade** (inicialmente Castelo do Piauí) que concentra,
em um só lugar, tudo o que um morador ou visitante precisa saber sobre a
cidade: empresas e comércio, serviços de utilidade pública (saúde, farmácias de
plantão, telefones úteis, transporte, coleta de lixo), vagas de emprego,
cupons e, futuramente, turismo e eventos.

Posicionamento: **"guia da cidade"**, não apenas "diretório de empresas". Isso
muda o nome, a navegação e o que entra no MVP.

## 2. Estado atual (o que já existe e funciona)

- **Home**: busca, categorias, empresas em destaque, seção "Dicas & Utilidade
  Pública" (plantão de farmácias, combustível, telefones úteis, ônibus,
  coleta de lixo), vagas e CTA "anuncie".
- **Busca**: categorias + lista de empresas com chevron, filtro por categoria.
- **Detalhe de empresa**: sobre, produtos/serviços com preços, horário com
  "aberto agora", avaliações, ações (WhatsApp, ligar, rota, site, redes),
  favoritar, compartilhar.
- **Autenticação**: Google, e-mail/senha e modo convidado. Contatos ocultos
  para convidados ("Entre para ver o contato") — modelo freemium.
- **Favoritos**, **Perfil**, **Tema claro/escuro**, **bottom tabs**.
- **Backend**: Express + MongoDB, Clerk, paginação, CORS, helmet.

## 3. Correções necessárias (bugs / qualidade)

1. **Mock data vazando em produção**: a busca exibe 40 "Empresa Mock 1..40"
   com "servicos — Rua Teste, 123". Remover do bundle ou esconder atrás de
   flag de desenvolvimento.
2. **Estado de convidado não persiste**: recarregar a página (F5) perde o
   modo convidado e redireciona para login. Persistir em `localStorage` /
   SecureStore.
3. **`/api/companies/1` retorna 404** no backend (empresa com id 1 não existe
   no Mongo); o app cai em mock silenciosamente. Validar ids ou seedar o
   backend.
4. **Campo de senha fora de `<form>`**: afeta acessibilidade, autofill e
   submit por Enter.
5. **Busca não filtra**: digitar não refina a lista (mostra todas). Falta
   debounce + query param.
6. **Paginação inexistente**: lista inteira carregada de uma vez; com muitas
   empresas vai pesar.
8. **`Content-Type` ausente em `http.ts`**: as requisições `POST`/`PUT` enviam
   corpo JSON sem o header `Content-Type: application/json`, então o
   `express.json()` do backend pode não parsear o body (resultando em
   `req.body` vazio). Corrigir no `request()` e no retry.
9. **Guest state não persiste** (já listado em #2) — adicionar persistência
   em `SecureStore`/`AsyncStorage` para sobreviver a reload.

## 4. Organização em módulos (evitar scope creep)

Para não "atacar tudo" de uma vez, o app deve ser organizado em módulos
independentes, cada um com dono e métrica:

- **Módulo "Empresas/Comércio"** (core): lojas, serviços, oficinas, etc.
- **Módulo "Utilidade Pública"**: hospitais/UPAs, farmácias de plantão,
  postos de saúde, campanhas (vacinação, doação de sangue), telefones úteis,
  transporte, coleta de lixo. Já existe parcialmente na home ("Dicas &
  Utilidade Pública").
- **Módulo "Oportunidades"**: vagas de emprego (já existe).
- **Módulo "Cupons"**: já existe, mas desativado por flag — reativar quando
  houver anunciantes.
- **Módulo "Turismo"** (futuro): pontos turísticos, eventos, hospedagem,
  roteiros.

Hospitais e campanhas não poluem a busca de lojas porque são categorias
separadas dentro do módulo de utilidade pública.

## 5. Ideias de funcionalidades

### Alto impacto / baixo custo

- Busca por voz (expo-speech) e por localização (GPS → "perto de mim").
- Filtro "aberto agora" na busca (horário já é calculado).
- Compartilhar empresa via WhatsApp/Instagram (botão existe, falta
  implementar).
- Notificações push de campanhas de vacinação (Expo) — encaixa no módulo
  de utilidade pública.
- Avaliações com foto e resposta do dono.

### Médio impacto

- Mapa (react-native-maps) com pins das empresas.
- "Rota" abrindo Google Maps/Waze.
- Cupons com QR code para validar na loja.
- Painel do lojista (admin) para editar perfil, produtos e ver métricas.
- Reviews verificados (só contas logadas podem avaliar).

### Longo prazo

- Multi-cidade (hoje hardcoded "Castelo do Piauí").
- App para lojistas (atualizar horário, promoções em tempo real).
- Integração com WhatsApp Business para atendimento.

## 6. Escopo sugerido

### MVP (v1.0)

- Diretório de empresas por categoria + busca + filtros (aberto agora,
  perto de mim)
- Detalhe completo + contato (liberado para logados)
- Favoritos + perfil + tema
- Módulo Utilidade Pública (hospitais, farmácias de plantão, telefones
  úteis)
- Vagas
- Auth (Google, e-mail, convidado) — já implementado
- Admin básico para cadastrar/editar empresas

### v1.1+

- Cupons com QR
- Mapa
- Notificações de campanhas
- Avaliações com foto

### Fora do escopo agora (evitar scope creep)

- Marketplace/pagamento dentro do app
- Chat entre usuários
- Delivery próprio

## 7. Decisão de escopo

O produto é **guia da cidade** (empresas + saúde + vagas + transporte +
turismo), não apenas diretório de empresas. Essa decisão afeta o nome, a
navegação e o que entra no MVP. Confirmada pelo mantenedor.
