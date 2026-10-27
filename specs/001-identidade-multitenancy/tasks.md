# 001 — Tarefas e evidências

Status: F1 funcional concluída e validada localmente. A/B em 25/10/2026;
C em 27/10/2026. Implantação/piloto não executados.

F1.C iniciada em 26/10/2026 e validada em 27/10/2026: empresa, vínculos e convites
locais reconciliáveis. Histórico de A/B preservado nas seções abaixo.

F1.B entrega Auth SSR, contexto e interface mínima; sem convites/gestão de
usuários. Critérios e limites em spec.md. Evidências separadas por incremento.

- [x] 001.1 Registrar versões e baseline de build/lint/tipos.
- [x] 001.2 Criar migrations, constraints e políticas.
- [x] 001.3 Verificar papéis, grants, dono das RPCs e search_path.
- [x] 001.4 Provisionamento restrito e seed idempotente de teste.
- [x] 001.5 Integrar Auth SSR, login/logout/recuperação.
- [x] 001.6 Resolver vínculos/contexto com revogação imediata.
- [x] 001.7 Construir menus e layouts responsivos por função (somente rotas implementadas).
- [x] 001.8 Implementar usuários/convites e proteção de último admin.
- [x] 001.9 Testar isolamento HTTP/RPC/dados/arquivos aplicáveis e cache (sem arquivos em F1).
- [x] 001.10 Rodar E2E/acessibilidade e registrar evidências (smoke de teclado/layout; sem certificação WCAG).
- [x] 001.11 Atualizar documentos e apresentar conclusão da fase local.

001.8 inclui edição da empresa, listagem/estado dos vínculos e ciclo de convite,
reenvio, falha, cancelamento e aceite. Novas funções são atribuídas por convite;
identidade/função/cliente de vínculos existentes são preservados. Carteira
comercial é F2. Storage não é usado em F1; não se declarou teste de arquivos
aprovado. Validação local não substitui implantação/piloto.

## Registro F1.C — 27/10/2026

RF03/RF04 no recorte F1, RN01–05, RS01–03/06/08 e UX04/05. Preservadas as
alterações anteriores não commitadas na branch feat/001-identity-foundation.
Nodemailer 10.2.1 (Node >=20) e @types/nodemailer 8.0.2 são as versões estáveis
consultadas em metadados oficiais; TypeScript e SMTP reais confirmaram o
subconjunto usado. Demais versões mantidas. Instalação npm: zero vulnerabilidades.
Fontes e configuração em docs/17, ADR-013 e lockfile.

| Critério | Comando real | Resultado | Evidência/limite |
| --- | --- | --- | --- |
| AC03–06/09–12 aplicáveis | `npm run test:admin` | Aprovado: 10 testes | Cinco cenários em Chromium 360/1440, Next/Auth/PostgREST/SMTP/Mailpit reais; sem mocks para autorizar ou aprovar entrega |
| AC01/02/06–09, regressão Auth | `npm run test:auth` | Aprovado: 8 testes | Login, recuperação, contexto, cookies, cache/logout e teclado preservados |
| AC03–06/10–12, regressão de banco | `npm run test:identity` | Aprovado: 23 grupos | JWTs reais, DML direto, constraints, auditoria, idempotência, concorrência; catálogo confere os 12 RPCs públicos e seus donos/grants/search_path |
| Migrations do zero | `supabase db reset --local --network-id meuatacado-local` | Aprovado | Três migrations aplicadas localmente, seed técnico preservado |
| Lint SQL | `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Aprovado | No schema errors found |
| Regressão pgTAP | `supabase test db --network-id meuatacado-local` | Aprovado: 7 testes | Schema private permanece sem USAGE/CREATE para authenticated |
| Web | `npm run check` | Aprovado | lint sem warnings, typecheck estrito, 27 testes unitários em 4 arquivos e build Next 16.4.3, Node 24.22.1 |
| Página inicial | `npm run test:e2e` | Aprovado: 5 testes | Larguras 360/390/768/1024/1440, resposta HTTP, idioma e teclado |
| Revisão | `git diff --check` | Aprovado | Sem whitespace errors; configuração anterior preservada com permissão 600 |
| Encerramento | `supabase stop` e `docker ps --filter name=meuatacado-local` | Concluído | Volume preservado e nenhum serviço deste projeto permaneceu ativo |

Os testes de administração verificam edição e revisão da empresa, menu/permissão,
status do seller e recusa de desativar o último admin. Exercitam foco e navegação
por teclado e ausência de corte horizontal. Testam e-mail real capturado para
conta existente (senha original continua funcional) e conta nova (aceite direto
antes de definir/autenticar senha negado; novo login por senha funciona depois).
Reenvio explícito chega ao Mailpit sem nova aprovação/vínculo.

Interrupção controlada do container Mailpit prova falha SMTP persistida, tentativa
1 de 5, reinício/restauração em finally e nova entrega na tentativa 2. Cancelamento
terminal bloqueia aceite. Teste HTTP/RPC usa atores normais para request/claim/
finish/accept; chave elevada é usada somente em Auth Admin pelo adaptador ou
setup de atores, nunca para consultar/escrever negócio durante a prova de RLS.

Duas solicitações iguais produzem um convite; duas claims têm um único vencedor;
lease expirado permite retomada e conclusão antiga é recusada. Dois aceites
simultâneos retornam o mesmo vínculo/evento; mudar payload com a mesma chave
gera conflito; chave nova não duplica o fato. São negados cliente de outro tenant,
ator inadequado, vendedor/comprador administrando convites, perfil inativo,
e-mail Auth alterado mantendo JWT antigo, aprovador revogado, convite expirado
e replay após revogação do vínculo aceito. Limites de cinco tentativas por convite
e trinta por tenant/hora são comprovados com dados de fixture locais.

Uma falha de auditoria injetada no aceite deixa convite sent e reverte membership
e chave de idempotência. A injeção é removida em finally; não se apagou histórico
comercial. SQL de operador serve apenas para preparar/inspecionar condições de
fixture. Provas de autorização usam JWTs legítimos sem bypass.

Falhas intermediárias encontradas/corrigidas antes do resultado final: leitura
interna do contador de auditoria sem grant; projeção do cliente antes de existir
membership; credencial aleatória inicial do Auth confundida com senha definida;
seletores de teste com e-mails repetidos entre projetos; disputa de foco durante
carga da página. Não se retirou RLS nem se usou chave administrativa para mascarar
falha de negócio. Contadores temporários do Auth foram limpos por reinício local
entre suítes, mantendo os limites configurados.

Entregues: migration incremental, projeções/RPCs, adaptador server-only Auth
Admin/SMTP, formulários/páginas de administração e aceite, configuração local
SMTP, runner test:admin e CI com reset entre suítes. Exemplo contém placeholders;
dev:local injeta credencial elevada local exclusivamente para Auth Admin em
memória do processo, sem alterar .env.local remoto. Spec/plano/README/ADRs/modelo/
contratos e guia docs/17 atualizados.

Limites: envio real, CI hospedado, HTTPS hospedado, auditoria WCAG completa e
limitação distribuída de abuso na Vercel não foram executados. Escolha final de
identidade visual/SMTP real e implantação pertencem às próximas etapas próprias.
F2, pedidos e financeiro não foram iniciados. Sem commit, push, publicação,
migration/configuração remota ou convite real nesta execução.

## Registro F1.B — 25/10/2026

Requisitos RF01/RF02, RN01–03/05, RS01–03/06/07 e UX01/02/04/05 nas telas
entregues. Mesma branch `feat/001-identity-foundation`; preservadas as alterações
anteriores não commitadas. SDKs estáveis verificados no registry oficial:
@supabase/ssr 0.12.7 (peer supabase-js ^2.114.0), supabase-js 2.118.0 (Node >=22)
e server-only 0.0.1; versões exatas e lockfile registrados. Node 24.22.1 e demais
versões da F0 mantidos. Instalação npm informou zero vulnerabilidades.

| Critério | Comando/método real | Resultado | Evidência/limitação |
| --- | --- | --- | --- |
| 001.5–7, AC01–08 aplicáveis; AC09 recuperação | `npm run test:auth` | Aprovado: 8 testes | Quatro cenários em Chromium 360/1440; app Next real + Auth/PostgREST/Mailpit Docker reais |
| Regressão de isolamento F1.A | `npm run test:identity` | Aprovado: 23 grupos | JWTs reais de 11 atores; constraints, DML direto, idempotência, auditoria, concorrência e revogação preservados |
| Regressão de banco | `supabase test db --network-id meuatacado-local` | Aprovado: 7 pgTAP | Schema private continua protegido |
| Lint SQL | `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Aprovado | No schema errors found; nenhuma migration nova em F1.B |
| Web | `npm run check` | Aprovado | lint sem warnings, typecheck estrito, 24 testes unitários em 3 arquivos e build Next |
| Build sem credenciais | `node node_modules/next/dist/bin/next build`, Node 24 | Aprovado | .env/.env.local/.env.production* reconhecidos afastados temporariamente, variáveis Supabase/APP_URL omitidas; finally restaurou arquivos, permissão .env.local 600 confirmada |
| Regressão de entrada | `npm run test:e2e` | Aprovado: 5 testes | 360/390/768/1024/1440, teclado, idioma, resposta HTTP, sem corte horizontal |
| Inspeção visual | Captura pública de /login em 360 px | Revisada | Sem credenciais na imagem; não equivale a auditoria WCAG |
| Revisão | `git diff --check` | Aprovado | Sem erros de whitespace |
| Encerramento local | `supabase stop` e `docker ps --filter name=meuatacado-local` | Concluído | Volume preservado; nenhum serviço deste projeto permaneceu ativo |

Oito E2E aprovados verificam login de admin/seller/buyer, vínculo único e
multivínculo, conta sem acesso, menus por função, acesso administrativo negado
diretamente por endpoint e página, tenant na query ignorado em favor do contexto
validado, cookie de contexto e sessão adulterados, POST com Origin externo
negado e GET de logout 405. Conferem envelope HTTP/requestId, no-store, cookies
HttpOnly/SameSite, ausência de localStorage, renovação real de sessão pelo Auth,
revogação com o mesmo JWT e troca/logout/back/login sem dados anteriores.

Login é operável por teclado; formulários têm labels, mensagens de erro/sucesso,
estado de envio e controle de exibição de senha. Recuperação usa e-mail capturado
no Mailpit, resposta igual para conta existente/inexistente, GET/reload sem
consumir OTP, confirmação POST, nova senha funcional, remoção de sessão e rejeição
de token reutilizado/inválido. Nenhum request de prova usa chave de bypass.
Setup com Auth Admin local é restrito à criação dos atores fictícios.

Falhas intermediárias foram corrigidas e os testes repetidos: API antiga de
Inbucket versus Mailpit real; prefixo PKCE rejeitado pelo parser; seletor de teste
conflitante com o anunciador de rotas; Referrer-Policy no-referrer persistindo
entre navegações e causando Origin null nos POSTs nativos; redirecionamento de
troca de senha interceptado pela reavaliação de uma página já desautenticada.
Não se liberou Origin null nem se enfraqueceu a proteção para aprovar o fluxo.
Reinícios do Auth local limparam limites temporários durante diagnóstico; limites
configurados foram mantidos. A rodada final dos oito testes passou integralmente.

Entregues: infraestrutura server-only Supabase/Proxy; módulo identity com
validação/casos de uso; formulários e shells acessíveis; rotas Auth, contextos,
espaços por função, projeção de empresa e endpoints privados; template local;
runner E2E com saídas temporárias removidas e sem traces; `dev:local`; CI com E2E
Auth no job Docker. Guia docs/16, ADR-012, README e specs atualizados. CI hospedado
e implantação remota não executados; dev:local é utilitário para revisão manual,
o smoke automatizado usou next start via test:auth.

AC01/02/07/08 estão aprovados nas telas atuais; AC03–06 possuem provas de banco
e aplicação aplicáveis; AC09 cobre recuperação, não convite; AC10–12 mantêm a
prova de F1.A. Não há Storage, convite reconciliável, edição da empresa na UI ou
gestão de usuários. Não há certificação de WCAG, teste de rate limit distribuído
na Vercel, cookies HTTPS no ambiente hospedado ou entrega de e-mail real. Próxima
etapa F1.C. Nenhum commit/push, deploy ou migration remota nesta execução.

## Registro F1.A — 25/10/2026

Branch `feat/001-identity-foundation`. Mantidas as versões exatas e lockfile de
F0, sem dependências novas: Node 24.22.1, npm 11.11.1, Next 16.4.3, React 19.3.1,
TypeScript 6.0.3 e Supabase CLI 2.122.0. Baseline `npm run check` aprovada antes
das alterações e novamente ao final (18 testes). Metadados `npm view next@16.4.3
engines peerDependencies --json` e `npm view supabase@2.122.0 engines --json`
reverificados; fontes e compatibilidade em docs/13. PostgreSQL real: 17.11
(`SHOW server_version`); imagem local selecionada após o vínculo remoto:
`supabase/postgres:17.11.0.003`. Patch difere da imagem observada em F0; major 17
preservado e migration testada nessa imagem. Auth e PostgREST reais, Docker local.

Comandos CLI abaixo executados pelo binário local `node_modules/.bin/supabase`.
Scripts npm executados com o Node 24.22.1, não com Node 25 global da máquina.

| Critério | Comando/método | Ambiente/versão | Resultado | Evidência/limitação |
| --- | --- | --- | --- | --- |
| 001.1 | `npm run check` | Node 24.22.1, macOS | Aprovado | lint sem warnings, typecheck, 18 testes Vitest e build estático |
| 001.2, AC12 parcial | `supabase db reset --local --network-id meuatacado-local` | PostgreSQL 17.11 | Aprovado | F0 + F1.A aplicadas do zero; nenhum reset remoto |
| 001.2 | `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | CLI 2.122.0 | Aprovado | No schema errors found |
| Regressão F0 | `supabase test db --network-id meuatacado-local` | pgTAP local | Aprovado | 1 arquivo, 7 testes; schema private segue sem USAGE/CREATE para authenticated |
| 001.3–4, 001.9 parcial | `npm run test:identity` | Auth/PostgREST/PostgreSQL locais reais | Aprovado | 23 grupos de verificações; JWTs emitidos por login de 11 atores; sem bypass nas chamadas de dados/RPC |
| Revisão de arquivos | `git diff --check` | Branch local | Aprovado | Sem whitespace errors; alterações anteriores de F0 preservadas |
| Encerramento | `supabase stop` + `docker ps --filter name=meuatacado-local` | Docker local | Concluído | Dados preservados; nenhum serviço do projeto permaneceu rodando |

O runner aprovado cobre cadastro público bloqueado, repetição de fixtures, dois
tenants, buyer multivínculo, carteira seller, perfil próprio, seleção de contexto
com UUID alheio, isolamento de projeção administrativa, metadata forjada e
inativação de perfil/tenant/cliente/vínculo. Verifica POST/PATCH/DELETE negados
diretamente nas sete tabelas para admin/seller/buyer, além de acesso anon negado.

Confere ENABLE/FORCE RLS, donos/grants/search_path dos cinco RPCs, roles sem
bypass/login/superuser, constraints e FKs compostas. Provisionamento privado
repetido e duas primeiras criações simultâneas produzem um tenant e um evento.
Comandos repetidos não duplicam auditoria; chave com payload diferente falha.
Revogação impede replay com o mesmo JWT. Duas edições com a mesma revisão têm
um vencedor; falha injetada de auditoria desfaz escrita e chave; duas desativações
simultâneas mantêm um admin ativo. Perfil global inativo não conta como substituto.

Falhas encontradas e corrigidas antes do resultado final: ALTER ROLE com atributo
reservado de superuser, provedor de e-mail desabilitado pela configuração da F0,
grant não delegável do schema Auth, fixture interpretado como pgTAP e parser de
booleanos psql. A primeira tentativa de PATCH sem filtro era recusada antes do
teste de privilégio; a prova final usa filtro válido e exige erro 42501. Nenhuma
falha foi marcada como aprovada; a suíte final passou após reset completo.

## Artefatos entregues

Migration `supabase/migrations/20261025000000_identity_foundation.sql`, fixtures
em `supabase/fixtures/identity.sql`, runner `scripts/test-identity.mjs`, comando
test:identity, lint do runner e integração no job Docker do CI. Spec, plano,
ADR-011, README e [guia da fundação](../../docs/15-identidade-fundacao.md)
atualizados. O workflow hospedado não foi executado nesta etapa.

## Limites registrados ao concluir F1.A (histórico)

AC03–06/10–12 têm cobertura de banco/HTTP aplicável a F1.A; não aprovam a F1
inteira. AC11 cobre provisionamento, não o convite. AC01/02/07/08/09 continuam
pendentes na aplicação. UI, Auth SSR, recuperação, convites reconciliáveis e
testes de interface/cache/arquivos permanecem não executados. Playwright da F0
não foi repetido neste incremento, que não altera interface. Nenhum teste usa
dados mockados para aprovar RLS.

Nenhuma migration remota, publicação, convite real ou operação comercial foi
executada. Sem commit/push automático. Continuar pela aplicação da F1, sem F2,
pedidos ou financeiro. Stack Docker deve permanecer parado após a verificação,
pois os bindings de porta da F0 não garantem restrição a localhost nesta máquina.
