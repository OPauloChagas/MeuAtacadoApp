# 000 — Tarefas e evidências

Status: F0 validada localmente em 24/10/2026. CI configurada; execução hospedada
não realizada. Nenhuma funcionalidade de F1 implementada.

- [x] F0.0 Ler instruções, preservar baseline e especificar escopo/aceite.
- [x] F0.1 Verificar/fixar versões e criar a base Next.js/TypeScript.
- [x] F0.2 Configurar ambiente, lint, tipos, testes e build.
- [x] F0.3 Configurar e verificar migrations/seed locais; configurar CI sem segredos.
- [x] F0.4 Registrar resultados reais, limitações e instruções de continuidade.

## Evidências iniciais

Em 24/10/2026: rg --files confirmou somente pacote documental; git status --short
mostrou os arquivos originais como não rastreados; git log informou ausência de
commits. Node do shell: 25.8.2, npm: 11.11.1, Docker CLI: 29.0.1.
Docker estava desligado e foi iniciado para verificar o banco real local.
Node 24 LTS foi usado isoladamente, sem alterar o runtime global.

## Registro de verificação

| Critério | Comando/método | Ambiente | Resultado | Limitações |
| --- | --- | --- | --- | --- |
| AC01 | Consultas `npm view <pacote> version engines peerDependencies --json`, docs oficiais e releases | 24/10/2026 | Versões exatas e fontes registradas em docs/13 | Escolha por compatibilidade; não inclui bibliotecas de fases futuras |
| AC01 | `npm ci` | Node 24.22.1 / npm 11.11.1, macOS arm64 | Exit 0; 185 pacotes instalados, 186 auditados, 0 vulnerabilidades informadas | Resultado do audit na data, não garantia futura |
| AC01 | `npm ls --all` | Mesmo runtime | Exit 0; sem conflitos de peers | npm lista dois artefatos opcionais de Sharp/WASM como extraneous, sem impedir instalação/build |
| AC02/AC03 | `npm run lint` | ESLint 10.13.0, plugin Next 16.4.3, typescript-eslint 8.72.0 | Exit 0; zero avisos de lint | Hooks/a11y não incluídos no lint nesta F0 estática |
| AC03 | `npm run typecheck` | Next typegen + TypeScript 6.0.3 estrito | Exit 0 | Tipos das rotas gerados antes do tsc |
| AC03/AC04 | `npm test` | Vitest 5.0.5 / Vite 8.3.5 | Exit 0; 1 arquivo, 18 testes aprovados | Configuração pública; nenhum teste de Auth/RLS simulado |
| AC03 | `npm run build` | Next 16.4.3 / React 19.3.1 / Node 24.22.1 | Exit 0; rotas `/` e `/_not-found`, build Turbopack | Página pública estática; rotas privadas serão dinâmicas na F1 |
| AC01/AC03 | `npm run check` após `npm ci` | Instalação limpa pelo lockfile | Exit 0; lint + tipos + 18 testes + build | Revalidação após resolver peers das dependências |
| AC02/AC03 | `playwright install chromium`; `npm run test:e2e` | Playwright 1.64.1, Chromium 156.0.8078.4 (build 1248), servidor `next start` | Exit 0; 5/5 aprovados em 360/390/768/1024/1440 px | Verifica HTTP 200, título, pt-BR, conteúdo, ausência de overflow e pageerror, skip link/teclado; não certifica WCAG nem desempenho |
| AC04 | `git check-ignore .env.local .env.production node_modules .next test-results supabase/.temp/project-ref` e revisão do exemplo | Repositório local | Todos ignorados; .env.example contém apenas placeholders e comentários | Nenhuma credencial remota fornecida ou necessária |
| AC05 | `supabase init`; `supabase start --network-id meuatacado-local` | CLI 2.122.0 / Docker 29.0.1 | Exit 0; serviços locais iniciados e migration aplicada | Saída com chaves geradas descartada; sem login/link remoto |
| AC05 | `supabase db reset --local --network-id meuatacado-local` (script `npm run db:reset`) | PostgreSQL 17.11, imagem `supabase/postgres:17.11.0.006` | Exit 0; recriação, migration, seed e restart aprovados | Apaga somente banco local; requer mesma rede do start |
| AC05 | `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` (script `npm run db:lint`) | Banco local real | Exit 0; nenhum erro de schema | Migration técnica ainda não tem funções de negócio |
| AC05 | `supabase test db --network-id meuatacado-local` (script `npm run db:test`) | pgTAP real; executor pg_prove 3.36 | Exit 0; 1 arquivo, 7 testes, Result: PASS | Schema privado e privilégios técnicos; não prova multi-tenancy, RLS ou JWTs de atores |
| AC06 | `ruby -e 'require "yaml"; ...'` com YAML.load_file e asserção dos jobs | YAML de .github/workflows/ci.yml | Exit 0; jobs web/database reconhecidos; comandos web/banco exercitados localmente | Revisão local de sintaxe/estrutura; não é execução GitHub Actions nem actionlint |
| AC05 | `supabase stop` | Stack Docker deste projeto | Exit 0; containers parados, dados locais preservados | Rede local e imagens permanecem para próximos testes |

## Ocorrências corrigidas e limitações reais

- O shell inicia com Node 25.8.2. Para cumprir a baseline LTS, as verificações npm
  usaram `PATH=/private/tmp/meuatacado-f0-runtime/node_modules/.bin:$PATH`, apontando
  para Node 24.22.1 instalado isoladamente. O uso normal está documentado com .nvmrc.
- Sandbox impediu downloads, gravação de preferências do Supabase em ~/.supabase,
  acesso ao socket Docker e abertura da porta 3100. As operações necessárias foram
  repetidas com aprovação fora do sandbox; essas falhas não foram tratadas como
  testes aprovados. Chromium foi baixado na versão exata do Playwright.
- A primeira instalação usou ESLint 9.39.5, cujo npm avisou fim de suporte. O
  agregado eslint-config-next com ESLint 10 passou lint, mas `npm ls` detectou peers
  antigos nos plugins React/import/a11y. A solução final usa ESLint 10, plugin
  oficial Next e typescript-eslint diretamente, sem overrides/legacy-peer-deps.
- Vite avisou formato CommonJS no arquivo de configuração inicial; `type: module`
  corrigiu a causa. As últimas execuções Vitest/build não tiveram esse aviso.
- O registry de imagens retornou rate limit temporário no primeiro start; o retry
  do próprio CLI completou os downloads sem trocar registry nem usar credenciais.
- O primeiro reset sem `--network-id` recriou o DB em outra rede e falhou no health
  check do Storage. O reset com a mesma rede passou; os scripts e a CI usam a
  opção de forma consistente. Não foi usado ignore-health-check.
- A inspeção real de portas mostrou `0.0.0.0`/`[::]` no Docker Desktop mesmo com a
  opção de binding local recomendada. Documentado em docs/13; não afirmar que a
  rede restringe as portas a localhost neste ambiente. Containers foram parados.
- Playwright emitiu aviso de NO_COLOR/FORCE_COLOR herdados do ambiente de execução,
  sem falhas de teste. CI hospedada não executada; pipeline apenas configurado e
  comandos correspondentes executados localmente. Não houve deploy, migration
  remota, envio real de e-mail ou pagamento.

## Entrega e continuidade

Arquivos principais: package.json/package-lock.json, configurações Node/TS/lint/
Vitest/Playwright, src/app, src/lib/env.ts e testes, .env.example/.gitignore,
supabase/config.toml, migration técnica, seed vazio, pgTAP e CI. Documentação
original preservada e complementada no README, changelog, docs 10/11/12/13 e
spec/plan/tasks desta pasta.

Credenciais Supabase/Vercel remotas não são necessárias para F0. Para F1, obter os
valores públicos do stack local ao configurar .env.local; provedor de e-mail,
ambientes remotos e credenciais restritas continuam previstos em docs/11/13.
Próxima fase: specs/001-identidade-multitenancy/. Seus critérios e checkboxes
continuam não implementados. Pedidos, financeiro e comissão não foram iniciados.
