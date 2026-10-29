# Tarefas e evidências F2.D

Publicação posterior autorizada em 29/10/2026: commit 5bb0856, migration remota,
CI success e deployment Ready/HTTPS conferidos. Evidências em
../publicacao-f2d/tasks.md; registros abaixo preservam a execução local anterior
à autorização de publicação.

- [x] D.1 Ler requisitos/instruções, inspecionar/preservar e especificar.
- [x] D.2 Migration/projeções/RLS/foto/cotação exata.
- [x] D.3 Casos de uso, API e UI por contexto.
- [x] D.4 Provar aceites com Auth/PostgREST/Storage reais locais.
- [x] D.5 Check/SQL/regressões pertinentes.
- [x] D.6 Documentar resultados e encerrar ambiente local.

## Verificações executadas em 28–29/10/2026

Comandos npm usam `PATH=/private/tmp/meuatacado-f2d-runtime/node_modules/.bin:$PATH`:
Node24.22.1 e npm11.11.1. Sem dependências/lockfile novos no projeto.

| Comando | Resultado observado |
| --- | --- |
| `node_modules/.bin/supabase start --network-id meuatacado-local` (stdout oculto) | Stack Docker local disponível; sem imprimir chaves |
| `node_modules/.bin/supabase db reset --local --network-id meuatacado-local` | Sete migrations aplicadas do zero, repetido após correção SQL |
| `node_modules/.bin/supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Sem erros ou avisos |
| `node_modules/.bin/supabase test db --network-id meuatacado-local` | 7 testes pgTAP aprovados |
| `npm run test:catalog` | 16 cenários aprovados, 8 em cada largura 360/1440, Chromium e serviços reais |
| `npm run check` | Lint sem warnings, tipos, 47 testes unitários em 8 arquivos e build Next aprovados |
| `npm run test:identity` | 23 verificações reais aprovadas; 17 tabelas FORCE RLS e 43 RPCs públicas conferidas |
| `npm run test:auth` | 8 cenários aprovados nas larguras 360/1440 |
| `npm run test:admin` | 10 cenários aprovados, incluindo SMTP/Mailpit real local e concorrência |
| `npm run test:customers` | 12 cenários aprovados, carteira, contatos e isolamento |
| `npm run test:products` | 14 cenários aprovados, fotos reais, grants e concorrência |
| `npm run test:commercial` | 16 cenários aprovados, precisão, imutabilidade, períodos e mutations |
| `npm run test:catalog -- --grep 'UI por teclado'` | 2 cenários aprovados após ajuste final das mensagens de erro pt-BR |
| `npm run test:e2e` | 5 cenários da página inicial aprovados em 360/390/768/1024/1440 |
| Reset local final, seguido de `db lint` e `test db` com os argumentos acima | Sete migrations reaplicadas; sem avisos SQL e 7 testes pgTAP aprovados após remover fixtures |
| `git diff --check` e verificação dos 18 arquivos novos | Sem erros de whitespace; lockfile e .env.local preservados |
| `node_modules/.bin/supabase stop` e `docker ps --filter name=meuatacado-local` | Encerramento com código 0 e nenhum serviço local remanescente |

As seis regressões foram executadas por runner temporário, com reset local
entre suítes; todos os processos retornaram 0. Configuração foi injetada somente
nos processos, sem alterar .env.local. Rodadas finais de UI, página inicial,
reset/lint/pgTAP e encerramento também retornaram 0. Docs/21, contratos, UX,
segurança, ADR-018, README e spec/plano/tarefas gerais atualizados. CI inclui
a nova suíte, sem afirmar execução hospedada.

## Evidência por aceite

- D01: catálogo buyer e página da carteira seller reais; teclado, quantidades,
  cálculo, erro de múltiplo preservando valor, revisão após preço alterado,
  busca/paginação descartando seleção, vazio, imagem WebP e ausência de overflow.
- D02: dois tenants e tabelas diferentes no mesmo tenant retornam os preços
  próprios. Sem atribuição, tabela inativa, rascunho, vigência futura/encerrada
  não dão preço. Transação com relógio comum comprova fim exclusivo/início incluso.
- D03: duplicatas consolidadas; 1–200 linhas, mínimo/múltiplo, limite agregado,
  preço/tenant/campos extras inválidos, 90071992547409.93 e 9007199254740993.00
  exatos, overflow AMOUNT_LIMIT. HTTP409 devolve nova simulação/token e nova
  revisão explícita volta a current. Nenhum dinheiro é convertido para Number.
- D04: mesmo JWT perde acesso após revogar vínculo/perfil/tenant/cliente,
  desativar tabela/produto ou retirar carteira; inclui Storage e proxy de foto.
  Identidade admin+seller continua limitada ao vínculo seller selecionado.
- D05: DTOs por allowlist, tabelas comerciais sem SELECT/DML até para admin,
  helpers fora da API, anon negado; categoria e busca literais, contadores e
  páginas isolados. Foto de SKU exclusivo da outra tabela negada ao buyer A.
  Assinatura/listagem/escrita/URL pública Storage negadas. Headers privados e
  nosniff comprovados. Troca de acesso/logout descarta seleção; header obsoleto
  não é aceito pela API.
- D06: oito cotações concorrentes repetem fingerprint sem criar auditoria ou
  idempotência. Alteração comercial concorrente retorna uma fotografia completa
  antiga ou nova, sem combinar preços; funções públicas de leitura são STABLE.
- D07: migrations/check/SQL e as seis regressões acima aprovados.

Rodadas intermediárias detectaram fixtures com SKU sem normalização, expectativas
de produto fora da primeira página, seletor de alert que incluía o anunciador
Next e DML sem filtro negado antecipadamente pelo safeupdate. Corrigidos os testes.
Foi corrigida também a leitura do DTO HTTP camelCase na interface, que usava o
parser RPC snake_case, e inicializações jsonb que geravam avisos SQL.

## Limites

Dados fictícios, Auth/JWTs comuns e PostgREST/Storage reais locais. Operador SQL
somente prepara/inspeciona fixtures e mudanças controladas; app sem chave elevada.
Sem traces, vídeos ou arquivos de senhas. Sem publicação/commit/push/migration
remota, provisionamento inicial, SMTP real ou início de F3. CI configurada para
a nova suíte; não executada no provedor nesta etapa. Não aprovados volumes
representativos, auditoria WCAG completa, outros browsers ou fluxo autenticado
hospedado. Fingerprint detecta mudança e não assina aceite/autorização.
