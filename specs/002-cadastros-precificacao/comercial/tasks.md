# Tarefas F2.C e evidências

- [x] C.1 Inspecionar, preservar estado e especificar o incremento.
- [x] C.2 Migration/RPC/RLS/imutabilidade/vigência.
- [x] C.3 Casos de uso e UI administrativa com decimais exatos.
- [x] C.4 Testes reais de permissão, precisão, período, concorrência e repetição.
- [x] C.5 Check web/SQL e regressões pertinentes.
- [x] C.6 Evidências, limites e encerramento local.

Concluída localmente em 27/10/2026. Resultados abaixo foram executados e
observados; nenhuma aprovação depende de mocks ou verificações ausentes.

## Entrega e preservação

Branch feat/002-commercial-versions criada a partir de 4403916, preservando
integralmente a F2.B não commitada. Sexta migration 20261027020000, oito tabelas
comerciais e 14 novas RPCs (totais 17 tabelas de negócio/40 RPCs). Módulo e
componentes commercial, nove páginas administrativas, dois endpoints GET,
menus/contexto e integração de condições ao cadastro do cliente. Especificação,
plano, ADR-017, modelo, contratos, UX, segurança e guia docs/20 atualizados.
Sem nova dependência; patches e lockfile da F2.B preservados. Node 24.22.1 e
npm 11.11.1; engines/peers oficiais do Next 16.4.3 revalidados em 27/10/2026.

## Evidência C01–C07

Comandos npm com `PATH=/private/tmp/meuatacado-f0-runtime/node_modules/.bin:$PATH`;
Supabase em `node_modules/.bin/supabase`. Resultados confirmados em 27/10/2026:

| Comando | Resultado observado |
| --- | --- |
| `supabase db reset --local --network-id meuatacado-local` | Seis migrations aplicadas do zero, incluindo 20261027020000 |
| `npm run check` | ESLint sem warnings, typecheck, 47 unitários em 8 arquivos e build Next aprovados |
| `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Sem erros/avisos de schema |
| `supabase test db --network-id meuatacado-local` | 7 testes pgTAP aprovados |
| `npm run test:commercial` | 16/16 aprovados, 8 cenários por largura 360/1440, Auth/PostgREST/PostgreSQL reais |
| `npm run test:commercial -- --grep 'valores exatos'` | 2 cenários dirigidos aprovados após acrescentar concorrência de edição do mesmo preço; prova incluída também na rodada final completa |
| `npm run test:products` | 14/14 aprovados, inclusive upload/download/remoção e políticas reais do Storage |
| `npm run test:customers` | 12/12 aprovados, carteira, revisão, contexto e DTOs anteriores preservados |
| `npm run test:admin` | 10/10 aprovados, SMTP/Mailpit e convites fictícios locais, leases e concorrência |
| `npm run test:auth` | 8/8 aprovados, login, recuperação local, cookies, seleção e logout |
| `npm run test:identity` | 23 grupos aprovados; metadados incluem 17 tabelas FORCE RLS e 40 RPCs de executor dedicado |
| `npm run test:e2e` | 5/5 aprovados, página pública em 360/390/768/1024/1440 |
| Reset final + SQL lint/pgTAP | Seis migrations aplicadas novamente; sem erro/aviso SQL, 7 pgTAP; zero tenants e zero usuários Auth após limpeza das fixtures |
| `git diff --check` | Sem erros de whitespace |
| `supabase stop` + `docker ps`/`lsof` | Serviços encerrados preservando volumes; nenhum container do projeto ativo nem servidor na porta 3100 |

Contadores temporários de login isolados entre suítes com
`docker restart supabase_auth_meuatacado-local`; configuração de limites mantida.
No total, 65 cenários E2E distintos aprovados, além de 47 unitários, 23 grupos
de identidade e 7 pgTAP. As duas repetições dirigidas não ampliam essa contagem.
Aviso herdado NO_COLOR/FORCE_COLOR no runner público não causou falha.

C01: UI real por teclado cria/edita tabela, rascunho e preço, publica, configura
comissão padrão zero/exceção, pagamento e condições do cliente; duplicata e
intervalo inválido preservam campos. Larguras 360/1440 sem overflow horizontal.
Seletores/listas pesquisam e paginam no servidor, sem carregar todo o tenant.

C02/C03: item/versão publicados recusam UPDATE/DELETE inclusive em SQL de
operador. Adjacência, intervalo aberto, sobreposição concorrente e relógio do
banco comprovados. Browser configurado em Pacific/Honolulu; tenants São Paulo
e New York preservam sua meia-noite. Datas infinity/-infinity/ano 10000/ano 0001
negadas diretamente no RPC. String 90071992547409.93 mantém os centavos na UI e
no PostgreSQL; limite numeric(18,2), taxas zero/100, JSON numérico, expoente,
NaN, excesso de casas e limites inválidos testados sem arredondamento.

C04/C05: cliente/seller/tabela/termo estrangeiro ou inativo negados; role do
vendedor referenciado preservada, FKs compostas e encerramento/cancelamento
mantêm histórico. Dois agendamentos concorrentes sobrepostos têm um vencedor.
As 14 RPCs recusam seller/buyer e UID admin+seller usando vínculo seller;
SELECT/DML direto nas oito tabelas nega acesso até ao JWT admin. Colunas
comerciais de customers continuam privadas. Anon, outro tenant, UI, API e
opções/contadores isolados; revogação corta inclusive replay com o mesmo JWT.

C06: alteração concorrente de preço/revisão tem um vencedor, replay não duplica
auditoria e payload divergente conflita. Revisão de conditions/contact compartilha
customers e impede perda concorrente de atualização. Falha específica de
auditoria TEST_COMMERCIAL_AUDIT desfaz tabela, rascunho/contador, item/revisão,
publicação, atribuição ao cliente e atribuição ao vendedor, incluindo chaves.
Cada teste confirma o erro injetado; uma falha SQL não relacionada não aprova
atomicidade. Fixtures/inspeção usam SQL de operador; provas de acesso usam JWTs
reais comuns, sem chave elevada no CRUD do app e sem mocks.

Falha intermediária corrigida: variável PL/pgSQL version colidia com coluna do
mesmo nome; renomeada para target_version/target_tenant. SQL lint sozinho não
detectou a ambiguidade exercitada pelo RPC real. End assignment captura o relógio
após adquirir locks/reautorizar; não permite horário retroativo por espera.
Validação de calendário reforçada também no banco antes da rodada final verde.

## Limites

Publicado é inteiramente imutável, inclusive vigência. Para alterar uma versão
sem fim, usar nova tabela/atribuição; para mudanças planejadas usar janelas
finitas. Não encurtar versão publicada silenciosamente. Buyer/seller aguardam
projeções F2.D; não recebem tabelas cruas. Sem pedidos, parcelas geradas,
snapshots, ganhos ou pagamentos de comissão. Configurações iniciais adiadas.

Sem commit/push/deploy/migration remota, convites reais ou primeiro tenant/admin.
.env.local preservado; ambiente local injetado nos processos. Runner recusa
Supabase remoto e apaga saída temporária; traces/vídeos desabilitados. CI inclui
test:commercial após reset, mas execução hospedada não realizada. Não aprova
HTTPS remoto, outros browsers, auditoria WCAG completa ou volumes reais.

F2.C encerrada. Próxima etapa F2.D, catálogo/cotação buyer e projeções de preço
autorizadas; não iniciada automaticamente. Publicado continua em 4403916.
