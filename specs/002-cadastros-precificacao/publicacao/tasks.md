# Tarefas e evidências da publicação

- [x] Confirmar autorização, repositório e destinos existentes.
- [x] Conferir estado remoto inicial: main em 3ec56d6; banco sem tabelas de
  negócio, sem usuários Auth e sem papéis de domínio; Vercel sem env Production.
- [x] Revisar/stage/commit das implementações, sem segredos.
- [x] Revisar dry-run e aplicar migrations sem fixtures/seed/reset.
- [x] Configurar e verificar Auth e variáveis da Vercel (recuperação desabilitada por falta de SMTP).
- [x] Push e deployment Ready verificados.
- [x] Smoke HTTPS e evidências finais registradas para commit/push documental.

Verificações locais completas da implementação: tasks.md da spec 002.
Publicação de desenvolvimento verificada; limites hospedados explicitados abaixo.

Pré-publicação: `npm run check` aprovado em Node 24.22.1: lint sem warnings,
typecheck, 33 unitários/5 arquivos e build. Revisão encontrou somente a string
fictícia sb_secret_fictional_private no teste de rejeição de segredo; nenhum
segredo real entre os arquivos candidatos. Whitespace de EOF em auth-shell
corrigido durante a revisão de stage.

Dry-run remoto aprovado: quatro migrations 20261024000000–20261027000000,
sem seeds/roles adicionais e com skip-vault. Config diff mínimo prevê alterações
somente de Auth: origem, URLs exatas, cadastro público fechado, senha mínima,
troca de senha segura e assunto da recuperação. Opções não declaradas do
serviço são preservadas. O template foi posteriormente excluído pela restrição abaixo.

## Banco e configuração remotos

- Commit f5ee9ff: identidade, convites, clientes/carteira, specs e testes,
  110 arquivos, sem ambientes locais ou credenciais no stage.
- db push remoto com projeto conferido e senha em memória: exit 0; aplicadas
  20261024000000, 20261025000000, 20261026000000 e 20261027000000. Sem seed,
  fixtures, reset ou Vault. Leitura pós-migration: 4 registros de histórico,
  7 tabelas com ENABLE/FORCE RLS, 18 RPCs do executor, 2 papéis sem login/
  superuser/bypass; anon/authenticated sem USAGE private e DML direto negado.
  Contadores de tenants e auth.users continuam zero.
- Primeira tentativa de config push recusada HTTP 400: Free/provedor padrão
  não permite personalização de template sem SMTP próprio ou upgrade. Nenhum
  plano/provedor alterado. Segunda tentativa excluiu somente o template e
  aplicou cinco propriedades de Auth. config diff seguinte: zero alterações
  declaradas; sete propriedades remotas não declaradas preservadas.
- Vercel Production: URL/chave pública existentes, APP_URL canônica e
  AUTH_RECOVERY_ENABLED=false. env pull temporário protegido comparou valores
  sem exibir; arquivo removido. Nenhuma senha PostgreSQL, chave elevada ou SMTP.
  GET Auth/settings: 200, disable_signup=true, external.email=true.
- Ajuste de disponibilidade protege página e Server Actions; flag ausente/true
  mantém recuperação local, false/inválida desabilita. Novo npm run check: lint,
  tipos, 34 unitários/5 arquivos e build aprovados. test:auth repetido após o
  ajuste: 8/8 aprovados em 360/1440 com Auth/Mailpit locais reais.

## Publicação e verificações hospedadas

- Commit 41e5832 registra a adaptação ao provedor Free e a configuração real.
  Push fast-forward confirmou `3ec56d6..41e5832 HEAD -> main`; ls-remote confirmou
  o SHA completo 41e583240421ef93ffe5f907da9fb674f061be2a.
- GitHub criou o deployment Vercel de produção dpl_87L3rJzZKRXYpq4XmRnvQyJMUTJF,
  URL imutável https://meuatacadoapp-avrf0glgb-pauls5.vercel.app, READY,
  Node.js 24.x. Alias https://meuatacadoapp.vercel.app confirmado no inspect.
- Workflow hospedado [40576241266](https://github.com/OPauloChagas/MeuAtacadoApp/actions/runs/40576241266):
  jobs web e database concluídos success, sem steps pendentes/falhos. Isso inclui
  as suítes locais reais de Auth/admin/clientes no runner, não atores remotos.
- Smoke HTTP real: /, /login e /recuperar-senha 200 com conteúdo esperado;
  formulário de login habilitado e recuperação indisponível sem formulário.
  /api/identity/context, /api/customers e /api/customers/sellers retornam 401,
  envelope/requestId e no-store. GET logout 405 e POST contexto com Origin
  externo 403. Nenhuma mutation de negócio ou e-mail executado.
- Smoke Chromium HTTPS em 360/1440: /empresa/clientes, /empresa/configuracoes
  e /cliente/minha-conta levam efetivamente a /login sem sessão. Sem overflow
  ou localStorage. Login presente e recuperação sem formulário nos dois tamanhos.
- Data API remota com chave pública sem sessão: sete tabelas negadas com
  401/42501; RPC get_my_contexts também negada. Sem chave elevada nas provas.
- Ajustes no smoke antes da aprovação: páginas com streaming usam status 200
  e meta redirect do Next, confirmado por navegação real; profiles usa user_id,
  então SELECT * foi adotado na prova anon para evitar erro de coluna inexistente
  antes do teste de privilégio. Nenhuma falha intermediária contada como sucesso.
- Docker local encerrado, volumes preservados e nenhum contêiner do projeto ativo.

Sem usuário remoto criado, não há prova autenticada hospedada nem primeiro
tenant/admin provisionado. Credenciais SMTP/domínio de envio e chave Auth Admin
restrita ainda ausentes; convites e recuperação remotos continuam indisponíveis.
Nenhum upgrade de plano, dados reais, fixtures remotas ou expansão F2.B realizada.
Novos commits documentais disparam publicação automática sem alterar o app.
