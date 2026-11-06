# Roteiro de Testes E2E (Playwright) — Guia Comercial

**Objetivo:** cobrir TODAS as funcionalidades da aplicação para 4 perfis de usuário.
**Perfis:** (1) Admin, (2) Usuário com empresa, (3) Profissional autônomo, (4) Usuário comum.
**Não commitar este arquivo.**

## Pré-condições
- Backend rodando (`npm run dev` em backend/) com Mongo + seed aplicado.
- Mobile web (`npx expo start --web`) ou build web; admin (`npm run dev`).
- Contas de teste (Clerk) para cada perfil.
- Dados de seed: cidade Castelo do Piauí, categorias, empresas, cupons, vagas, avisos, utilidade pública.

## Perfil 1 — Admin
1. Login como admin → redireciona para painel admin.
2. Dashboard carrega métricas (empresas, usuários, profissionais).
3. CRUD Empresas: listar (paginado), criar, editar, excluir; validar campos obrigatórios; erro em duplicata.
4. CRUD Categorias: listar, criar, editar, excluir; validar slug único.
5. CRUD Cupons: listar, criar (vincular empresa), editar, excluir; validar datas.
6. CRUD Vagas (Jobs): listar, criar, editar, excluir.
7. CRUD Banners: listar, criar (upload imagem), editar, excluir, reordenar.
8. CRUD Avisos (Notices): listar, criar, editar, excluir; validar datas ISO.
9. CRUD Utilidade Pública: listar, criar, editar, excluir.
10. CRUD Cidades: listar, criar, editar.
11. CRUD Profissionais Autônomos: listar, criar, editar, excluir.
12. Usuários: listar, visualizar detalhe.
13. Logout.

## Perfil 2 — Usuário com empresa
1. Login → Home com cidade no header.
2. Minha empresa: visualizar dados, editar (nome, descrição, endereço, telefone, WhatsApp, horários, galeria), salvar e confirmar sucesso real (sem falso positivo).
3. Criar/editar cupom da empresa.
4. Criar/editar vaga da empresa.
5. Perfil: editar nome, telefone, imagem; persistir.
6. Favoritos: adicionar/remover empresa; lista rolável.
7. Busca: por texto, por categoria, paginação ("Carregar mais" sem duplicar).
8. Detalhe da empresa: contatos (WhatsApp/telefone), mapa, galeria, horário de funcionamento.
9. Notificações push: registrar token (sem console.log).
10. Logout.

## Perfil 3 — Profissional autônomo
1. Login → perfil profissional.
2. Editar dados profissionais (nome, categoria, cidade, telefone, WhatsApp).
3. Aparecer na busca/listagem de profissionais autônomos.
4. Contato via WhatsApp/telefone (redigido para convidado).
5. Favoritos.
6. Logout.

## Perfil 4 — Usuário comum
1. Navegar Home (categorias, empresas em destaque, profissionais).
2. Busca por texto/categoria/voz (se suportado).
3. Filtro "Perto de mim" (geolocalização).
4. Detalhe de empresa e profissional.
5. Favoritar empresas (isolado por conta).
6. Visualizar cupons, vagas, avisos, utilidade pública, banners.
7. Mapa interativo (reage a mudanças).
8. Convidado (sem login): contatos redigidos (phone/whatsapp ocultos).
9. Login/logout.

## Cenários transversais
- Erros HTTP: 401/403/404/409/422 exibem mensagem adequada.
- Paginação em todas as listagens.
- Responsividade mobile (viewport 375x812) e web.
- Acessibilidade: labels em clicáveis.
- Sem console.log de token em produção.
- Sem dados mockados em produção (resposta vazia não mostra mock).

## Execução sugerida
- `npx playwright test` com projetos por perfil (admin, company, autonomous, common).
- Fixtures de auth por perfil (storageState).
- Screenshots em falha.

## Resultados dos testes
Os resultados de cada execução devem ser armazenados em arquivos Markdown, **um arquivo por perfil**, na pasta `docs/superpowers/test-results/` (não commitar):

- `docs/superpowers/test-results/admin.md`
- `docs/superpowers/test-results/usuario-com-empresa.md`
- `docs/superpowers/test-results/profissional-autonomo.md`
- `docs/superpowers/test-results/usuario-comum.md`

Cada arquivo deve conter, por cenário: status (✅ passou / ❌ falhou / ⚠️ parcial), observações, evidências (screenshot/console), e data/hora da execução. Em caso de falha, incluir passos para reproduzir e logs relevantes.

## Observações
- Não commitar este roteiro nem os artefatos de teste gerados.