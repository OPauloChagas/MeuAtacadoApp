# 12 — Registro de decisões e referências

Status geral: propostas de arquitetura para orientar a primeira implementação; decisões comerciais em `00-escopo-premissas.md` ainda precisam de validação do responsável pelo produto.

## ADR-001 — Aplicação Next.js modular na Vercel

Contexto: hospedagem web Vercel e dados Supabase solicitados. Decisão proposta: Next.js/TypeScript com execução de servidor na Vercel, sem backend separado no MVP. Benefício: um repositório e uma publicação da aplicação. Consequência: regras e transações precisam respeitar ambiente de funções e banco remoto. Exigir .NET altera a solução e a hospedagem do backend; não introduzir sem decisão.

## ADR-002 — Tenant é o fornecedor

Contexto: isolamento de empresas vendedoras e seus clientes. Decisão: tenant por fornecedor; comprador é vínculo com cliente local ao tenant. Consequência: identidade global pode ter vários contextos; não compartilhar dados comerciais por CNPJ/e-mail entre fornecedores.

## ADR-003 — Segurança no servidor e banco

Decisão: Auth + memberships atuais + RLS + grants mínimos + RPC autorizada para mutations. RLS limita linhas; DTO/RPC limita colunas e operações. Chave elevada somente para tarefas administrativas restritas. Consequência: testes devem cobrir acesso direto e execução privilegiada, não apenas interface.

## ADR-004 — Um único fato financeiro para os dois portais

Decisão: contas a pagar do comprador são uma projeção dos recebíveis do fornecedor. Benefício: evita saldos divergentes. Limite: comprador não tem um ERP financeiro geral; acompanha somente compras nos fornecedores dos seus vínculos.

## ADR-005 — Histórico e comissão por recebimento

Decisão proposta: congelar preço no envio e comissão na confirmação; liberar ganho proporcional a recebimentos. Correções por eventos reversos. Consequência: maior cuidado com locks, arredondamento acumulado e reversão de comissão já paga.

## ADR-006 — Escritas críticas atômicas e idempotentes

Decisão: operações transacionais no PostgreSQL, via RPC com papel dedicado sem bypass de RLS. Consequência: não distribuir confirmação/baixa em múltiplas chamadas web independentes. Grants, dono de funções e search_path fazem parte da revisão de segurança.

## ADR-007 — Bootstrap isolado e versões reproduzíveis

Status: aceita para F0 em 24/10/2026 pelo escopo solicitado. Não altera as
premissas comerciais propostas nas outras ADRs.

Contexto: o repositório contém especificações que devem ser preservadas, e o
responsável solicitou somente F0 antes de identidade/multitenancy.
Decisão: bootstrap manual Next.js App Router, TypeScript estrito, Node 24 LTS,
dependências diretas exatas e lockfile npm. Versões/fontes e justificativas em
[ambiente local](13-ambiente-local.md). TypeScript 6 é adotado por compatibilidade
com o parser do lint, apesar de existir versão 7 estável.
ESLint 10 usa o plugin oficial Next diretamente e typescript-eslint: o agregado
eslint-config-next ainda inclui plugins com peers limitados a ESLint 9; não forçar
esses peers nem manter a linha 9 fora de suporte. Reavaliar hooks/a11y na F1.
Supabase CLI e Docker locais, migration técnica de schema privado, seed vazio e
CI sem segredos. Sem entidades, autenticação ou dados comerciais de F1.
Consequências: build e smoke independem de credenciais; testes pgTAP de F0
comprovam apenas infraestrutura, e não substituem JWTs/atores reais da F1.
Alternativa descartada: gerar projeto sobre a raiz com scaffolder e arriscar
substituir documentação; instalar toda a stack proposta sem uso atual também
ampliaria o trabalho de manutenção sem um caso de uso.

## ADR-008 — Conectar plataformas existentes antes de F1

Status: aceita para preparação e vínculo em 24/10/2026, conforme pedido atual.
Vercel: projeto existente `pauls5/meuatacadoapp`. Supabase: primeiro ambiente de
desenvolvimento/homologação; organização/disponibilidade ainda dependem de acesso.

Decisão: usar as contas existentes, reutilizar o projeto Vercel encontrado e
preparar um projeto Supabase de desenvolvimento gratuito, se disponível, após
conectar a conta. Qualquer recurso pago exige autorização. Vincular Vercel
localmente e configurar somente variáveis públicas nos ambientes definidos. Registrar
evidências em `specs/000-bootstrap/integracao-plataformas/`. Não implementar
identidade ou domínio comercial para testar infraestrutura. Não interpretar
"integrar" como autorização para publicar, aplicar migrations remotas, criar
recursos pagos ou migrar cobrança para o Marketplace. Vínculos e variáveis locais
permanecem ignorados pelo Git. Quando houver solicitação explícita de deploy ou
migration, registrar projeto/ambiente e ação separadamente antes de executar.

## ADR-009 — Primeira publicação da base F0

Status: autorizada em 24/10/2026 pelo pedido explícito de commit, push e deploy.
Destino: `pauls5/meuatacadoapp` na Vercel, produção pela branch `main` de
`OPauloChagas/MeuAtacadoApp`. Publicar a página inicial e infraestrutura F0
verificadas, mantendo a integração Supabase como pendência. Essa decisão
substitui somente a proibição anterior de publicar a aplicação nesta execução;
não autoriza migrations remotas ou início da F1. Verificar o deployment real,
HTTP e conteúdo, sem tratar publicação da página como sistema implementado.

Resultado: base F0 publicada pelo CLI Vercel, deployment
`dpl_FZ5VrASpXoXf2xtG5LMaJyhDZuXg` READY, alias
https://meuatacadoapp.vercel.app com HTTP 200 e conteúdo pt-BR confirmados.
O push posterior foi confirmado em `3ec56d6`, que também gerou novo deployment
automático READY pela integração Git. Evidências nas tarefas de integração.

## ADR-010 — Supabase remoto de desenvolvimento separado de produção

Status: executada em 25/10/2026. O responsável concluiu o login do CLI e confirmou
o plano Free da organização no painel; a criação foi autorizada na continuidade
da integração. Criado `meuatacado-dev` (`aonjpucxfkeafoqnyrry`) em São Paulo,
sem upgrade ou add-ons, e vinculado o CLI deste workspace.

Decisão: URL e chave publishable em .env.local e Vercel Development/Preview.
Production mantém a página F0 sem Supabase; banco de produção separado antes
do piloto. Senha gerada só em configuração local ignorada com permissão 600;
nenhuma chave administrativa no ambiente da aplicação. A consulta ao Chaveiro
que exigiu senha foi cancelada; a confirmação de plano veio do responsável e
as operações foram feitas pelo CLI já autenticado.

Consequências: infraestrutura pronta para F1, sem migrations remotas ou dados
comerciais criados. O teste público confirma Auth e a proteção da introspecção
Data API; não equivale a testes de autorização/RLS. Detalhes e limites em docs/14.

## ADR-011 — Primeira etapa da identidade com executor sujeito a RLS

Status: implementada e validada localmente em 25/10/2026. Primeiro entregar e provar a base
de autorização antes de implementar a interface. RPCs usam `atacado_executor`,
sem login/superuser/BYPASSRLS e diferente do dono das tabelas. Helpers booleanos
privados usam `atacado_membership_reader`, com policies simples e SELECT de
colunas mínimas para evitar recursão; não recebem identidade arbitrária.

O schema Auth pertence ao Supabase e o operador postgres local não pode delegar
seu USAGE. A ponte privada `request_user_id()`, com dono postgres e search_path
vazio, executa somente `auth.uid()`, sem consultar tabelas ou receber parâmetros.
Esse é o único helper definidor privilegiado; comandos públicos e consultas de
vínculos continuam nos papéis sem bypass. O schema private não é exposto na API.

Clientes não recebem DML. Leituras diretas permitidas somente em profiles,
memberships e customers mínimos, sob RLS; dados internos da empresa, auditoria,
convites e idempotência exigem projeções/operações autorizadas. Os dois primeiros
comandos administrativos são update_tenant e set_membership_status, com lock do
tenant, versão/repetição/auditoria. Após autodesativação, policies internas ainda
permitem concluir auditoria e resposta de idempotência do próprio ator; toda RPC
revalida a autorização antes de reutilizar resposta anterior.

Provisionamento é função privada invocadora, executável somente por postgres;
sua chave global fica em tabela técnica privada porque o tenant ainda não existe
ao iniciar a operação. Não há endpoint público ou chave elevada no backend comum.
Fixtures e prova de RLS usam Auth/JWTs locais reais. Integração remota permanece
intocada; F1.A não equivale à F1 completa. Fontes: documentação oficial Supabase
RLS e PostgreSQL 17 CREATE FUNCTION/Row Security, consultadas em 25/10/2026.

Configuração local: `[auth].enable_signup=false` bloqueia cadastro público;
`[auth.email].enable_signup=true` mantém o provedor de login ativo. Na CLI fixada,
o segundo parâmetro também controla o provedor, conforme
[relato no repositório oficial](https://github.com/supabase/cli/issues/7055).
Um teste HTTP verifica o bloqueio de signup e os logins reais. Nenhum config push.

## ADR-012 — Auth SSR e seleção de contexto sem cliente Auth no navegador

Status: implementada e validada localmente (F1.B). Usar @supabase/ssr e supabase-js com chave
pública no servidor. Proxy renova a sessão e cada caso de uso chama getUser e
revalida o vínculo por RPC; não confiar em getSession/user_metadata. Tokens e
seleção de contexto em cookies HttpOnly, SameSite=Lax e Secure sob HTTPS. Não
há SDK Auth/browser ou sincronização de tokens em localStorage nesta etapa.

Formulários usam Server Actions com verificação de origem do Next.js. Endpoints
GET de projeção não alteram estado. Recuperação confirma token_hash por POST,
com template local e destinos fixos; GET não consome o link. Respostas de envio
são iguais para conta existente/inexistente. Rate limits do Supabase Auth ficam
ativos; limites distribuídos por origem/abuso da aplicação e SMTP remoto deverão
ser verificados antes de implantação/piloto, sem prometer proteção ainda não
medida. Consultas Auth/RPC e páginas privadas usam no-store. Troca de contexto e
logout fazem navegação completa para descartar estado de navegação anterior.
Login e confirmação de recuperação também recarregam o documento, inclusive
para renovar a política de referrer após sair da URL com token. Rotas normais
usam same-origin; confirmação usa no-referrer. A troca de senha redireciona pelo
servidor antes da reavaliação da página protegida após remover os cookies.

Fontes verificadas em 25/10/2026: [SSR oficial](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[senhas](https://supabase.com/docs/guides/auth/passwords) e
[Server Actions/segurança](https://nextjs.org/docs/app/guides/data-security).
Sem novas credenciais elevadas no app, migrations remotas ou envio real.

## ADR-013 — Convites com aprovação transacional e entrega reconciliável

Status: implementada e validada localmente em 27/10/2026, iniciada em 26/10/2026.
Auth Admin generateLink e SMTP são
adaptadores exclusivos do servidor; CRUD/RPC permanece com JWT do ator. Chave
elevada nunca acessa tabelas de negócio. Conta existente recebe magiclink; conta
nova recebe invite e define senha. A decisão não informa existência da conta ao
admin, não reinicializa senha e não cria membership antes do aceite verificado.

Solicitação idempotente, aprovação e tentativas persistem no PostgreSQL. Claim
com lease de 2 minutos impede dois envios simultâneos; timeout admite repetição
explícita. SMTP pode entregar mais de um e-mail após resultado incerto; aprovação,
membership e evento de aceite são únicos. Limites por tenant/hora e por convite
são persistentes. Cancelamento e revogação do aprovador impedem aceite posterior.

Um advisory transaction lock por tenant precede o lock de linha dos comandos
administrativos e também serializa aceite de ator ainda sem vínculo. O executor
continua sem bypass/dono de tabela. Policies internas de inserção de profile e
membership são restritas ao destinatário de aprovação válida. Função privada
selada, de dono postgres, lê somente se o próprio ator possui e-mail confirmado
correspondente e senha definida no Auth; não recebe identidade arbitrária, não
lista usuários e não escreve. Essa leitura evita aceitar e-mail de JWT obsoleto
e contorna a impossibilidade de delegar USAGE de auth já registrada na ADR-011.

O Auth cria uma credencial aleatória inicial no convite; encrypted_password não
vazio não comprova senha definida pelo destinatário. Para identidade convidada
ainda sem profile, o aceite exige autenticação por senha comprovada pelo amr
assinado pelo Auth. Após definir a senha, a aplicação efetua esse login antes do
RPC. Profiles existentes são identidades já provisionadas/onboardadas e não
sofrem reset automático de senha. E-mail continua conferido contra auth.users.

Fontes: [Auth Admin generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink),
[SMTP Nodemailer](https://nodemailer.com/smtp), consultadas em 26/10/2026.
Prova de método de autenticação conferida em 27/10/2026 na
[referência de claims](https://supabase.com/docs/guides/auth/jwt-fields).

## ADR-014 — Cadastro de clientes com projeções por contexto e escrita serializada

Status: implementada e validada localmente em 27/10/2026; evidências na spec 002.
F2.A amplia customers sem iniciar
preço/pagamento. Documento ganha chave gerada normalizada e unique por tenant;
não é validação fiscal/consulta de CNPJ. Preservar documento legado e FKs por ID.

authenticated perde SELECT amplo de customers e recebe apenas colunas mínimas
de identificação já usadas pela F1. Contato/endereço e carteira vêm de RPCs com
projeção explícita. Papel do vínculo selecionado limita leitura/escrita além da
RLS global do usuário; buyer não recebe carteira nem acessa listas. Seller lê
somente carteira ativa e só altera contatos, mesmo possuindo outro vínculo.

Writes reutilizam lock transacional de tenant da F1 antes de travar o cliente,
revalidam contexto/carteira e exigem revisão/idempotência/auditoria. Seller ativo
do mesmo tenant é exigido para nova atribuição; histórico existente não é apagado.
Reatribuição/bloqueio cortam acesso e replay na próxima operação. Listas e opções
de vendedores são paginadas (20 padrão, 100 máximo), com contadores autorizados.

Fontes oficiais consultadas em 27/10/2026:
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[privilégios](https://www.postgresql.org/docs/17/ddl-priv.html) e
[locks PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html).

## Referências técnicas oficiais

Consultadas em 24/10/2026. Reconsultar ao implementar para APIs, versões e limites atuais. Estes links embasam mecanismos da plataforma; as regras comerciais deste pacote são propostas específicas do projeto.

- Next.js na Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Variáveis de ambiente: https://vercel.com/docs/environment-variables
- Ambientes Vercel: https://vercel.com/docs/deployments/environments
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase proteção de dados/chaves: https://supabase.com/docs/guides/database/secure-data
- Next.js autorização: https://nextjs.org/docs/app/guides/authentication

## Processo de mudança

Nova decisão registra problema, alternativas relevantes, escolha, consequências, status e data. Se alterar dinheiro, acesso ou estado de pedido, atualizar requisitos, regras, modelo, contratos e casos de aceite afetados antes de codificar.
