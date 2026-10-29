# Evidências da publicação F2.D

- [x] Autorização e destinos reais confirmados em 29/10/2026.
- [x] Check local repetido: lint/tipos, 47 unitários e build aprovados.
- [x] Revisão de segredos, metadados e dry-run.
- [x] Commit e migration incremental remota.
- [x] Push, CI e deployment confirmados.
- [x] Smoke HTTPS e evidências finais.

Histórico remoto conferido: seis versões 20261024000000–20261027020000.
Evidências reais da implementação local preservadas em catalogo/tasks.md.
Nada pendente é contabilizado como aprovado.

Dry-run aprovado: somente 20261028000000_catalog_quotes.sql, seeds=[] e
roles=[], skip-vault ativo. Revisão dos 40 arquivos candidatos comparou segredos
locais em memória e padrões de tokens; zero achados, sem imprimir valores.
Diff --check limpo. Destino Vercel conferido por project inspect, Node24.x,
build npm run build e install npm ci.

## Publicação confirmada em 29/10/2026

- Commit 5bb085670b2fc4cb8b1b653e89184c47c14f1236, 40 arquivos; stage e
  diff --check aprovados. Push fast-forward cf4d60e..5bb0856 HEAD -> main.
- db push --linked --skip-vault --yes com senha somente no ambiente do processo:
  exit 0, somente 20261028000000_catalog_quotes.sql, seeds=[]/roles=[].
- Consulta após migration: sete versões, 17 tabelas FORCE RLS e 43 funções
  públicas do executor. Três novas RPCs STABLE/security definer, search_path
  vazio/row_security on, EXECUTE authenticated e anon negado. SELECT/DML cru
  de preço negado, reader sem unit_price e private USAGE negado ao cliente.
  Papéis sem login/superuser/bypass; bucket product-photos privado/3 MB/WebP.
  Zero tenants e auth.users mantidos. Nenhuma configuração Auth/env/plano mudou.
- Deployment Git dpl_AUAFZxq4unnpYX1nkkUifYGhP2qq, target production, READY,
  SHA 5bb0856 confirmado. URL https://meuatacadoapp-1w11ill85-pauls5.vercel.app
  com aliases principal, pauls5 e git-main; https://meuatacadoapp.vercel.app.
- CI [40889115168](https://github.com/OPauloChagas/MeuAtacadoApp/actions/runs/40889115168)
  completed/success; jobs database e web success, nenhum step falho. Inclui
  catálogo com Auth/PostgREST/Storage Docker reais, sem atores remotos.

## Smoke hospedado

/, /login e /recuperar-senha HTTP200. GET catálogo e foto HTTP401 com
UNAUTHENTICATED/requestId/no-store; POST com Origin externo HTTP403. Três RPCs
de catálogo e dez tabelas comerciais recusam chave pública sem sessão:
HTTP401/42501. Chromium HTTPS 360/1440: rotas buyer e cliente interno
redirecionam ao login, sem overflow/localStorage. Nenhum usuário, dado,
upload ou e-mail criado no remoto. Sem prova autenticada hospedada, pois o
primeiro tenant/admin continua adiado. SMTP permanece pendente.

Documentação atualizada após os resultados, preparada para commit/push final.
A próxima implementação, F3.A, ficará em branch própria e terá validação local;
esta publicação não inclui seus futuros arquivos/migrations.
