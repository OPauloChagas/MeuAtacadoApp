# Tarefas e evidências — Integração de plataformas

Status: infraestrutura Vercel/Supabase validada em 25/10/2026. Base F0 publicada,
push inicial confirmado; Supabase de desenvolvimento ativo e configurado em
.env.local e Vercel Development/Preview. Identidade/F1 não iniciada.

- [x] Ler instruções e inspecionar baseline de F0 e documentação oficial.
- [x] Verificar identidade e identificar projeto existente na Vercel.
- [x] Vincular diretório e verificar configurações Vercel.
- [x] Autenticar/identificar projeto e ambiente Supabase.
- [x] Configurar variáveis públicas nos ambientes confirmados.
- [x] Validar conexão real e registrar resultados finais.
- [x] Revisar arquivos e verificar a base antes da publicação.
- [x] Criar os commits da base e configuração de publicação.
- [x] Confirmar envio da main inicial ao GitHub após autenticar o Git.
- [x] Confirmar deployment Vercel Ready e validar o endereço publicado.

## Autorização de publicação

Em 24/10/2026 o responsável pediu explicitamente "faça o commit e push e o
deploy". Destino já vinculado: Vercel `pauls5/meuatacadoapp`, produção a partir
de `main`, repositório `OPauloChagas/MeuAtacadoApp`. Publicar somente a base F0;
Supabase, autenticação, pedidos e financeiro permanecem pendentes. A autorização
não inclui executar migrations remotas.

## Continuidade Supabase — 25/10/2026

O responsável confirmou o login no terminal. CLI 2.122.0 autenticado: `orgs list`
retornou uma organização (`rorbrcxzxmlryygaoolx`); `projects list` retornou somente
`estetisaas`, que não será alterado. Novo destino de desenvolvimento proposto:
`meuatacado-dev` em `sa-east-1`. A criação aguarda confirmar o plano Free da
organização. A consulta autenticada do plano pela Management API usa a credencial
do CLI no Chaveiro do macOS, sem imprimir token. Essa consulta foi cancelada
porque exigiu uma autorização indisponível ao responsável; nenhuma credencial
foi lida, copiada ou exibida, e o Chaveiro não foi alterado. O CLI continua
autenticado e funcional. Solicitada confirmação do plano diretamente no painel
Supabase, em Organization → Billing → Subscription Plan, antes de provisionar.

Development/Preview Vercel e .env.local receberão somente URL/chave pública.
Production Vercel continuará independente desse banco de desenvolvimento.

O responsável confirmou no painel que a organização está no plano **Free**.
Nova listagem do CLI mostrou somente o projeto existente, sem `meuatacado-dev`.
Criar o novo projeto nessa organização, em São Paulo, sem selecionar upgrade,
instance size pago ou add-ons. Senha do banco gerada criptograficamente e guardada
em `.env.supabase.local` ignorado e com permissão 600; não exibir a senha ou
copiá-la para variáveis públicas/Vercel. Migrations remotas continuam excluídas.

### Resultado Supabase confirmado

| Critério | Comando/método | Resultado real | Limite |
| --- | --- | --- | --- |
| AC02 | CLI `projects create meuatacado-dev --org-id rorbrcxzxmlryygaoolx --region sa-east-1 --db-password <gerada em memória> --output json`, executado por wrapper sem imprimir credenciais | Exit 0; ref `aonjpucxfkeafoqnyrry`, ACTIVE_HEALTHY, São Paulo | Plano Free confirmado pelo responsável; nenhum tamanho pago, upgrade ou add-on solicitado |
| AC02 | CLI `link --project-ref aonjpucxfkeafoqnyrry`, senha somente via SUPABASE_DB_PASSWORD no processo da ferramenta | Exit 0 | Nenhuma migration ou mutation de negócio solicitada |
| AC02 | CLI `projects list --output json` após vínculo | Novo projeto ACTIVE_HEALTHY e linked=true; `estetisaas` continua ACTIVE_HEALTHY e linked=false | Nenhuma alteração solicitada no outro projeto |
| AC03 | `projects api-keys --project-ref aonjpucxfkeafoqnyrry --output json`, sem --reveal, seleção da publishable em memória | Chave pública configurada em .env.local, permissão 600 | Resposta bruta/chaves não exibidas; nenhuma secret/service_role revelada |
| AC03 | Vercel `env add <nome> development,preview --scope pauls5 --project meuatacadoapp --no-sensitive --yes`, valores por stdin | Exit 0 nas duas variáveis públicas, tipo Config | Nenhuma chave elevada ou senha do banco enviada à Vercel |
| AC03 | `vercel env ls production --scope pauls5` | Exit 0, nenhuma variável | Production não usa o Supabase de desenvolvimento |
| AC03 | Node 24 com .env.local, readPublicSupabaseConfig e GET /auth/v1/settings | Exit 0, validador aprovado, HTTP 200 e JSON | Sem identidade de usuário; não é teste de login/RLS |
| AC03 | GET /rest/v1/ com publishable no header apikey | HTTP 401, mensagem Secret API key required | A primeira verificação supunha 200 e falhou; diagnóstico confirmou proteção do endpoint de introspecção. Resultado negativo esperado, sem mudar grants ou usar chave secreta |
| AC03 | `vercel env pull <temporário> --environment development/preview --scope pauls5 --yes`, comparação dos valores e Node 24 usando cada arquivo baixado | Exit 0 para ambos; valores corretos, Auth 200, introspecção protegida, sem credencial elevada no ambiente | Arquivos temporários em /private/tmp com permissão 600, removidos; valores não registrados |
| AC04 | `npm run check` com Node 24.22.1 e configuração real de desenvolvimento | Exit 0, lint, typecheck, 18 testes unitários e build | Sem testes de domínio/RLS, sem medições de desempenho; nenhum E2E novo necessário para mudança apenas de ambiente/docs |
| AC05 | Consulta remota Git e deployments, após envio pelo VS Code | HEAD remoto e local `3ec56d6`; deployment Git `meuatacadoapp-o586qesvf-pauls5.vercel.app` READY | Confirma o push original; as atualizações documentais posteriores ficam no workspace até novo commit |

Configuração e critérios AC01–AC05 atendidos para o escopo de infraestrutura.
Nenhuma migration da aplicação foi aplicada no Supabase remoto. F1 permanece
não implementada. Configuração operacional em `docs/14-supabase-remoto.md`.

## Verificação anterior ao primeiro push

- `git ls-remote --heads origin`: exit 0, nenhuma branch remota; repositório vazio.
  A primeira consulta no sandbox falhou por DNS e foi repetida fora dele.
- Revisão dos 58 arquivos candidatos: nenhum padrão de credencial encontrado;
  `.env.local`, `.vercel/`, `node_modules/`, `.next/` e `supabase/.temp/` excluídos.
  Essa inspeção não substitui as invariantes de segurança das próximas fases.
- `npm run check` em Node 24.22.1: exit 0, lint, typecheck, 18 testes e build.
- `npm run test:e2e`: exit 0, 5/5 casos Chromium nas larguras especificadas.
  Aviso de cores NO_COLOR/FORCE_COLOR herdado do executor, sem falha de teste.
- Vercel CLI `list meuatacadoapp --scope pauls5 --json`: exit 0, nenhum deployment
  existente antes do push. Não executar migrations no banco remoto nesta etapa.

## Execução da publicação

- Commit inicial criado: `f0fa78c` — `feat: bootstrap Atacado app and configure Vercel deployment`.
- `git push -u origin main` falhou por ausência de autenticação GitHub no Git
  (`could not read Username`); nenhum token GitHub disponível no ambiente e CLI
  GitHub ausente. Solicitada conexão GitHub ou autenticação Git no VS Code.
  O envio não foi considerado concluído.
- O dry-run Vercel confirmou Next.js e exclusão de `.env.local`, mas mostrou
  artefatos ignorados pelo Git ainda presentes no upload do CLI. Adicionado
  `.vercelignore` para excluir caches, resultados de testes e estado local do
  Supabase. A publicação será feita diretamente pelo CLI enquanto o push aguarda
  autenticação; a origem do deploy será registrada sem alegar publicação via Git.
- Commit de exclusões do upload: `6223286` — `chore: exclude local artifacts from Vercel uploads`.
- Dry-run final: Next.js detectado, nenhum arquivo de ambiente, cache ou estado
  local entre os arquivos regulares do upload. Diretórios vazios sem conteúdo
  ainda podem aparecer na listagem do CLI.
- `vercel deploy --prod --yes --scope pauls5`: exit 0, publicação pelo CLI a partir
  de `6223286`, deployment `dpl_FZ5VrASpXoXf2xtG5LMaJyhDZuXg`, estado READY.
  URL imutável: https://meuatacadoapp-exfbpj134-pauls5.vercel.app.
  Alias de produção: https://meuatacadoapp.vercel.app.
- Build remoto: Node 24.x, Vercel build CLI 65.1.0, `npm ci` (182 pacotes
  instalados/183 auditados, nenhuma vulnerabilidade informada), Next 16.4.3,
  build concluído em 19 s. Aviso npm de cache-dir injetado pelo ambiente Vercel,
  sem falha de instalação/build. Não modifica as versões fixadas do projeto.
- `vercel inspect meuatacadoapp-exfbpj134-pauls5.vercel.app --scope pauls5 --json`:
  exit 0, target production, READY, runtime nodejs24.x, aliases atribuídos.
- Smoke HTTP real no alias público: exit 0; HTTP 200, lang pt-BR, título
  `Atacado | Ambiente de desenvolvimento` e conteúdo inicial confirmados. A
  primeira tentativa no sandbox falhou por DNS; repetida fora dele com sucesso.
- O responsável escolheu autenticar Git pelo VS Code. Essa escolha não é
  evidência de push; a última consulta remota ainda mostrou repositório vazio.
  GitHub Actions não executou por não haver push confirmado. Nenhuma migration
  remota, convite ou operação comercial foi executada.

## Evidências históricas do vínculo inicial (antes do Supabase)

| Verificação | Comando/método | Resultado | Limite |
| --- | --- | --- | --- |
| Vercel | CLI `whoami` | Exit 0, conta `opaulochagas` | Consulta somente leitura |
| Projetos Vercel | CLI `project ls --json` | Exit 0, `meuatacadoapp` no escopo `pauls5`, Node `24.x`, sem URL de produção | Projeto do outro sistema não será alterado |
| Git | `git remote -v` | Origin `https://github.com/OPauloChagas/MeuAtacadoApp.git` | Arquivos de F0 continuam não rastreados; sem commit/push nesta execução |
| Supabase | CLI `projects list --output json` | Exit 1, acesso não autenticado no CLI | Não significa ausência de conta ou projeto no serviço |
| Conexões | Consulta de plugins disponíveis | Vercel e Supabase disponíveis, ainda não conectados nesta conversa | Sugerir conexão não autentica nem instala |
| CLI Supabase | `link --help`, `login --help` | Parâmetros da versão 2.122.0 consultados | Sandbox bloqueou gravação de preferências; consulta repetida fora dele |
| Vínculo local | Vercel CLI `link --yes --project meuatacadoapp --scope pauls5` | Exit 0; `.vercel/project.json` criado | CLI também criou `.env.local` com OIDC token; conteúdo não exibido nem versionado |
| Configuração remota | Vercel CLI `project update meuatacadoapp --scope pauls5 --framework nextjs --node-version 24.x --install-command 'npm ci' --build-command 'npm run build' --dev-command 'npm run dev' --yes` | Exit 0; preset corrigido de Other para Next.js e comandos definidos | Sem deploy, mudança de cobrança, domínio ou configurações de outro projeto |
| Variáveis remotas | Vercel CLI `env ls --scope pauls5` | Exit 0; nenhuma variável configurada no projeto | Supabase ainda não conectado |
| Proteção de arquivos | `git check-ignore .vercel/project.json .env.local` | Ambos ignorados | `.env.local` contém somente a variável OIDC obtida pelo CLI; valores não registrados |
| Qualidade local | `npm run check` com Node 24.22.1 | Exit 0; lint, typecheck, 18 testes e build aprovados | Não é validação de conexão Supabase nem build hospedado |
| Confirmação Vercel | `project inspect meuatacadoapp --scope pauls5` após atualizar | Exit 0; preset Next.js, Node 24.x, instalação npm ci e build npm run build | Nenhum deploy |
| Repositório conectado | GET `/v9/projects/<id>` pela API autenticada Vercel, saída limitada a metadados | Exit 0; GitHub OPauloChagas/MeuAtacadoApp, branch de produção main, sem deployment de produção | Não imprimir resposta completa com configurações sensíveis |
| Arquivos | JSON de vercel.json e whitespace dos seis arquivos criados/alterados | Aprovados | Revisão local; sem execução de build na Vercel |

## Esclarecimento inicial do responsável (histórico)

O responsável informou que criou apenas o repositório GitHub e que ainda não
houve commit/build. A API Vercel, entretanto, confirmou a existência de
`pauls5/meuatacadoapp`; esse projeto foi reutilizado, sem criar duplicata. Como
não há ambiente Supabase existente informado, preparar desenvolvimento/homologação
como primeiro destino. A autenticação Supabase foi solicitada via plugin ou
`npx supabase login` no terminal do próprio usuário, sem tokens pelo chat.
O responsável escolheu instalar/conectar o plugin Supabase aqui; a escolha ainda
não comprova que a conexão foi concluída. Aguardar confirmação ou disponibilidade
efetiva das ferramentas antes de declarar acesso autenticado.
Ao encerrar esta interação, nenhuma ferramenta Supabase havia se tornado
disponível. Falta concluir essa conexão para consultar organizações, verificar
possível cobrança e criar o projeto de desenvolvimento. Nenhuma chave Supabase,
projeto de banco, migration remota ou alteração de Auth foi criada.

## Informações solicitadas inicialmente (resolvidas em 25/10/2026)

Confirmar nome/link do projeto Supabase e ambiente. Para permitir consulta pela
conta, conectar Supabase ou autenticar o CLI local pelo fluxo oficial. Nenhuma
senha, access token ou chave administrativa deve ser enviada no chat.

Login concluído pelo CLI, plano Free confirmado pelo responsável, projeto criado
e conexão validada conforme a seção Resultado Supabase confirmado acima.
