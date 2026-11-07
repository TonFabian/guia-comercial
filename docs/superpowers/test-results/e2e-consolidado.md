# Resultados E2E Consolidados — Guia Comercial

**Data/hora:** 2026-11-06
**Ambiente:** mobile web (http://localhost:8081), backend (http://localhost:4000), admin (http://localhost:5173), seed aplicado (--reset).
**Executor:** Playwright MCP (navegação manual).

## Resumo

- Home carrega e exibe todas as seções (categorias, empresas em destaque, outras empresas, turismo, avisos, profissionais, vagas, telefones úteis).
- Seção "Turismo & Eventos" exibe 4 atrações + 2 eventos com badges (Hoje/Em breve).
- Detalhe de atração e evento funcionam (contato gated para não-logado).
- Busca mesclada (chips Atrações/Eventos) funciona com seções separadas e navegação correta.
- Erro de nested `<button>` (OtherCompanies) corrigido.
- Bug de guard no sign-in corrigido (convidado conseguia ser redirecionado para Home).
- Auth: login realizado com sucesso (usuário Admin user).
- Admin painel carrega com todas as seções (Empresas, Categorias, Cidades, Banners, Cupons, Vagas, Avisos, Utilidade Pública, Atrações, Eventos, Usuários).
- Admin CRUD de Atrações e Eventos listam dados do seed com formulários completos.
- Favoritar empresa funciona (botão alterna Adicionar/Remover).
- Meus dados, Minha empresa e Configurações funcionam.

## Cenários validados

| # | Cenário | Status | Observação |
|---|---------|--------|------------|
| 1 | Home carrega | ✅ | Todas as seções renderizam |
| 2 | Seção Turismo & Eventos | ✅ | 4 atrações + 2 eventos |
| 3 | Detalhe de atração | ✅ | /tourist-spot/[id] |
| 4 | Detalhe de evento | ✅ | /event/[id], status Em breve |
| 5 | Busca mesclada (atrações) | ✅ | Seção Atrações com 4 itens |
| 6 | Busca mesclada (eventos) | ✅ | Seção Eventos com 2 itens |
| 7 | Navegação por item de busca | ✅ | Abre detalhe correto |
| 8 | Perfil (logado) | ✅ | Exibe dados do usuário |
| 9 | Favoritos (vazio) | ✅ | Mensagem de vazio |
| 10 | Nested button fix | ✅ | OtherCompanies sem erro de hidratação |
| 11 | Sign-in guard fix | ✅ | Convidado acessa login |
| 12 | Admin — painel carrega | ✅ | Sidebar com todas as seções |
| 13 | Admin — CRUD Atrações | ✅ | Lista 4 atrações, form completo |
| 14 | Admin — CRUD Eventos | ✅ | Lista 2 eventos, form completo |
| 15 | Favoritar empresa | ✅ | Botão alterna Adicionar/Remover |
| 16 | Meus dados | ✅ | Form com nome, sobrenome, telefone, bairro |
| 17 | Minha empresa | ✅ | Mensagem "Você ainda não tem empresas cadastradas" |
| 18 | Configurações | ✅ | Tema, notificações, suporte, sobre |

## Pendências / não testados

- Fluxos de convidado (contatos redigidos) — parcialmente (contato gated visto).
- Admin CRUD de outras entidades (Empresas, Categorias, etc.) — não executados (formulários análogos).

## Conclusão

Fluxo principal do mobile (Home, Turismo, Busca mesclada, Detalhes) funcional. Admin painel funcional com CRUD de Atrações e Eventos. Dois bugs corrigidos durante a validação. Backend com 417 testes verdes.