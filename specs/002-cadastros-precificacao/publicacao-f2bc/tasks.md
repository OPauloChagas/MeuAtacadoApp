# Tarefas da publicação F2.B/C

- [x] Confirmar autorização, preservar alterações e consultar destinos reais.
- [x] Revisar versões/CLI e repetir check local.
- [x] Conferir histórico remoto/dry-run e revisão de segredos dos candidatos.
- [ ] Commit das implementações e aplicar duas migrations autorizadas.
- [ ] Push e conferir deployment/CI.
- [ ] Smoke HTTPS, evidências finais, commit/push documental.

27/10/2026: main remoto em 44039165c24751bb3cd6b6e9695edbb863d8a23b;
branch de implementação feat/002-commercial-versions. Vercel project inspect
confirma projeto/Node24/build npm run build/install npm ci. Supabase projects
list confirma meuatacado-dev vinculado e ACTIVE_HEALTHY. Outro projeto da
organização permanece fora do escopo.

npm run check aprovado novamente: ESLint sem warnings, typecheck, 47 unitários
em 8 arquivos e build. Evidências de 65 cenários E2E, 23 verificações reais de
identidade e 7 pgTAP na entrega local em comercial/tasks.md; não se confundem
com testes autenticados hospedados. Nenhuma mudança de aplicação desde essa
rodada de regressões. Publicação em execução; resultados posteriores pendentes.

Pré-migration remoto: quatro versões 20261024000000–20261027000000, zero tenants
e auth.users. Helpers storage.allow_only_operation(text)/allow_any_operation(text[])
presentes, bucket product-photos ausente, btree_gist disponível/ainda não instalada;
executor sem login/superuser/bypass. Dry-run lista somente as duas migrations
20261027010000 e 20261027020000, seeds=[] e roles=[], skip-vault ativo. Nenhuma
mudança Auth/env/plano necessária. Auditoria dos 79 arquivos candidatos comparou
segredos locais em memória e padrões de tokens: zero achados, sem imprimir valores.
