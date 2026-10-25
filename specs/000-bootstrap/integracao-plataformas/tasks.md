# Tarefas e evidências — Integração de plataformas

Status: publicação da base F0 autorizada e em andamento; Supabase aguardando a
conexão escolhida pelo responsável. Integração Supabase ainda não validada.

- [x] Ler instruções e inspecionar baseline de F0 e documentação oficial.
- [x] Verificar identidade e identificar projeto existente na Vercel.
- [x] Vincular diretório e verificar configurações Vercel.
- [ ] Autenticar/identificar projeto e ambiente Supabase.
- [ ] Configurar variáveis públicas nos ambientes confirmados.
- [ ] Validar conexão real e registrar resultados finais.
- [x] Revisar arquivos e verificar a base antes da publicação.
- [ ] Criar commit e enviar a main ao GitHub.
- [ ] Confirmar deployment Vercel Ready e validar o endereço publicado.

## Autorização de publicação

Em 24/10/2026 o responsável pediu explicitamente "faça o commit e push e o
deploy". Destino já vinculado: Vercel `pauls5/meuatacadoapp`, produção a partir
de `main`, repositório `OPauloChagas/MeuAtacadoApp`. Publicar somente a base F0;
Supabase, autenticação, pedidos e financeiro permanecem pendentes. A autorização
não inclui executar migrations remotas.

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

## Evidências

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

## Esclarecimento do responsável

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

## Informações solicitadas

Confirmar nome/link do projeto Supabase e ambiente. Para permitir consulta pela
conta, conectar Supabase ou autenticar o CLI local pelo fluxo oficial. Nenhuma
senha, access token ou chave administrativa deve ser enviada no chat.
