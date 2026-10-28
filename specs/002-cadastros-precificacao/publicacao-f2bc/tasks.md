# Tarefas da publicação F2.B/C

- [x] Confirmar autorização, preservar alterações e consultar destinos reais.
- [x] Revisar versões/CLI e repetir check local.
- [x] Conferir histórico remoto/dry-run e revisão de segredos dos candidatos.
- [x] Commit das implementações e aplicar duas migrations autorizadas.
- [x] Push e conferir deployment/CI.
- [x] Smoke HTTPS, evidências finais e documentação pronta para commit/push.

27/10/2026: main remoto em 44039165c24751bb3cd6b6e9695edbb863d8a23b;
branch de implementação feat/002-commercial-versions. Vercel project inspect
confirma projeto/Node24/build npm run build/install npm ci. Supabase projects
list confirma meuatacado-dev vinculado e ACTIVE_HEALTHY. Outro projeto da
organização permanece fora do escopo.

npm run check aprovado novamente: ESLint sem warnings, typecheck, 47 unitários
em 8 arquivos e build. Evidências de 65 cenários E2E, 23 verificações reais de
identidade e 7 pgTAP na entrega local em comercial/tasks.md; não se confundem
com testes autenticados hospedados. Nenhuma mudança de aplicação desde essa
rodada de regressões. Publicação das implementações concluída; documentação
final preparada com os resultados confirmados abaixo.

Pré-migration remoto: quatro versões 20261024000000–20261027000000, zero tenants
e auth.users. Helpers storage.allow_only_operation(text)/allow_any_operation(text[])
presentes, bucket product-photos ausente, btree_gist disponível/ainda não instalada;
executor sem login/superuser/bypass. Dry-run lista somente as duas migrations
20261027010000 e 20261027020000, seeds=[] e roles=[], skip-vault ativo. Nenhuma
mudança Auth/env/plano necessária. Auditoria dos 79 arquivos candidatos comparou
segredos locais em memória e padrões de tokens: zero achados, sem imprimir valores.

## Publicação confirmada

- Commit 4a40e9f94f410f7e13be3bb872908f1fe911ea53: 79 arquivos, produtos/fotos,
  versões comerciais, specs/testes/CI; stage sem segredos e diff --check limpo.
- db push --linked --skip-vault --yes com senha somente em memória: exit 0,
  aplicadas somente 20261027010000_products_private_photos.sql e
  20261027020000_commercial_versions.sql, seeds=[]/roles=[]. Sem reset remoto.
- Consulta posterior: seis migrations, 17 tabelas ENABLE/FORCE RLS e 40 funções
  públicas do executor, todas security definer/search_path vazio/row_security on,
  EXECUTE auth permitido e anon negado. Zero privilégios DML direto; zero SELECT
  comercial direto; colunas novas de customers privadas. Papéis sem login/
  superuser/bypass e executor sem ser dono de tabela. USAGE private negado a
  anon/authenticated. Extensão btree_gist em extensions.
- Bucket product-photos public=false, file_size_limit=3000000, MIME image/webp,
  quatro políticas esperadas do Storage. Zero tenants e usuários Auth mantidos.
- Push fast-forward 4403916..4a40e9f HEAD -> main confirmado; ls-remote conferiu
  SHA completo. Deployment automático Git dpl_EGgrCziQWBJVCNbXHmDsvUkqpL3H,
  https://meuatacadoapp-o76q7oeru-pauls5.vercel.app, target production, READY.
  inspect confirmou aliases principal, pauls5 e git-main. Projeto usa Node24.x.
- Workflow [40605060349](https://github.com/OPauloChagas/MeuAtacadoApp/actions/runs/40605060349)
  concluído success, jobs web/database success e nenhum passo falho. Inclui as
  suítes com Docker/Auth/Storage reais no runner, sem atores remotos.

## Smoke hospedado

HTTPS principal: /, /login e /recuperar-senha HTTP200 com conteúdo esperado.
Login habilitado, recuperação indisponível e sem formulário. Sete endpoints
privados (incluindo produtos/detalhe/foto e comercial/opções) retornam 401,
requestId/envelope e no-store. POST foto com Origin externo recusado 403 antes
de ler body; nenhuma operação de escrita comercial executada.

Auth settings HTTP200 com signup público fechado. Data API com chave pública
sem sessão nega as 17 tabelas HTTP401/42501 e cinco RPCs de leitura HTTP401/42501.
Nenhuma chave elevada usada nas provas. Chromium HTTPS em 360/1440: dez novas
rotas protegidas redirecionam efetivamente para /login, sem overflow horizontal
ou localStorage; login e indisponibilidade de recuperação conferidos nos dois
tamanhos. Streaming Next validado pela navegação, sem depender de HTTP307.

Não se criaram usuários, tenants, fixtures, uploads ou e-mails no remoto.
Sem primeiro tenant/admin, não há prova autenticada hospedada de CRUD/foto/
publicação comercial; essas provas passaram localmente e no runner CI.
SMTP/template e chave Auth Admin restrita continuam pendentes para convites/
recuperação remotos. Sem mudança de plano ou liberação de operação real/piloto.
F2.D permanece pendente. Docker local não foi iniciado para esta publicação.

README/guias/status da spec atualizados para refletir a publicação; registros
de entrega local anteriores preservados como históricos. Commit documental
não altera aplicação ou migrations e dispara novo deployment automático Git.
