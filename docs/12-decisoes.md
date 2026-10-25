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
Push pendente de autenticação GitHub, sem confundir deploy CLI com publicação
disparada por Git. Evidências detalhadas nas tarefas de integração.

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
