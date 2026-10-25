# 13 — Ambiente local e versões de F0

Verificação em 24/10/2026. F0 prepara a infraestrutura; não implementa identidade
nem operações comerciais. Não há projeto remoto vinculado ou publicação.

## Versões escolhidas

Versões diretas exatas no package.json; dependências transitivas no package-lock.json.
Foram consultados os metadados oficiais do registry npm (`npm view <pacote>
version engines peerDependencies --json`) e a documentação dos mantenedores.

| Componente | Versão | Fonte/compatibilidade |
| --- | --- | --- |
| Node.js | 24.22.1 LTS | [Release oficial](https://nodejs.org/en/blog/release/v24.22.1); fixado em .nvmrc/.node-version, engines 24.x |
| npm | 11.11.1 | [Metadados da versão](https://registry.npmjs.org/npm/11.11.1); suporta Node >=22.9 |
| Next.js / @next/eslint-plugin-next | 16.4.3 | [Release](https://github.com/vercel/next.js/releases/tag/v16.4.3), [instalação](https://nextjs.org/docs/app/getting-started/installation); Node >=20.9, React 19 |
| React / React DOM | 19.3.1 | [React](https://registry.npmjs.org/react/19.3.1), [React DOM](https://registry.npmjs.org/react-dom/19.3.1); mesmo patch |
| TypeScript | 6.0.3 | [Metadados](https://registry.npmjs.org/typescript/6.0.3); escolhido em vez de 7.0.2, pois typescript-eslint 8.72.0 declara >=4.8.4 <6.1 |
| ESLint / @eslint/js | 10.13.0 / 10.0.1 | [ESLint](https://registry.npmjs.org/eslint/10.13.0), [regras JS](https://registry.npmjs.org/@eslint/js/10.0.1); plugin Next direto, sem o agregado eslint-config-next |
| typescript-eslint | 8.72.0 | [Metadados](https://registry.npmjs.org/typescript-eslint/8.72.0); suporta ESLint 10 e TypeScript <6.1 |
| @types/node | 24.19.2 | [Metadados](https://registry.npmjs.org/@types/node/24.19.2); linha do runtime |
| @types/react / @types/react-dom | 19.3.0 | [React](https://registry.npmjs.org/@types/react/19.3.0), [DOM](https://registry.npmjs.org/@types/react-dom/19.3.0) |
| Vitest | 5.0.5 | [Guia oficial](https://vitest.dev/guide/), [metadados](https://registry.npmjs.org/vitest/5.0.5); engines inclui Node 24 |
| Vite | 8.3.5 | [Guia](https://vite.dev/guide/), [metadados](https://registry.npmjs.org/vite/8.3.5); peer compatível com Vitest |
| Playwright | 1.64.1 | [CLI oficial](https://playwright.dev/docs/test-cli), [metadados](https://registry.npmjs.org/@playwright/test/1.64.1); smoke Chromium |
| Supabase CLI | 2.122.0 | [Instalação local](https://supabase.com/docs/guides/local-development/cli/getting-started), [metadados](https://registry.npmjs.org/supabase/2.122.0); Node >=20 e Docker |
| PostgreSQL local | 17.11 | [Release oficial](https://www.postgresql.org/docs/17/release-17-11.html); imagem Supabase `postgres:17.11.0.006` selecionada pelo CLI fixado; confirmado por `SHOW server_version` |
| actions/checkout | 7.0.1 | [Release oficial](https://github.com/actions/checkout/releases/tag/v7.0.1); sem persistência de credenciais |
| actions/setup-node | 7.1.0 | [Release oficial](https://github.com/actions/setup-node/releases/tag/v7.1.0); runtime interno Node 24 e .nvmrc para o projeto |

Next.js App Router é instalado manualmente para preservar o pacote SDD existente.
O [plugin Next direto](https://nextjs.org/docs/app/api-reference/config/eslint)
evita peers antigos de React/import/a11y no agregado eslint-config-next. O lint
inclui regras JS, TypeScript e Next Core Web Vitals; não inclui regras de hooks
ou auditoria de acessibilidade completa nesta página estática de F0.
Sem fontes remotas ou dependência de credenciais no build. Tailwind, shadcn,
formulários, cliente Supabase e SSR Auth entram quando necessários nas próximas
specs; não instalar/adaptar versões futuras por antecipação.

## Aplicação

Instale/use Node 24.22.1 pelo gerenciador de sua preferência (`nvm install` e
`nvm use`, se disponível) e npm 11.11.1. Depois:

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. A página inicial funciona sem arquivo de ambiente.
Typecheck gera os tipos das rotas antes de executar TypeScript, inclusive em
checkout limpo. Para verificar o build real e o smoke:

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

Playwright inicia e encerra `next start` em 127.0.0.1:3100; exige build anterior.
Testa as cinco larguras da especificação, idioma, resposta HTTP, erro de execução,
conteúdo e navegação por teclado. Não certifica WCAG nem mede LCP/p95.

## Supabase somente local

Inicie Docker Desktop/OrbStack. Crie uma vez a rede com a opção de binding local,
conforme [orientação oficial](https://supabase.com/docs/guides/local-development).
Se já existir, use a mesma rede:

```sh
docker network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 meuatacado-local
npm run db:start
npm run db:reset
npm run db:lint
npm run db:test
```

O reset apaga apenas o banco local deste projeto. Não usar `--linked`, `--db-url`
remoto, `supabase link` ou `db push` neste fluxo. Não é necessário login no Supabase.
Os scripts de start, reset, lint e teste fixam a mesma `--network-id`: omitir essa
opção no reset com CLI 2.122.0 recria o banco em outra rede e quebra Auth/Storage.

Na combinação testada (Docker Desktop 29.0.1/macOS e CLI 2.122.0), as portas
apareceram em `0.0.0.0`/`[::]` mesmo com a opção de binding da rede. Portanto, essa
opção não comprova restrição a localhost neste ambiente. Conferir com
`docker ps --format '{{.Names}} {{.Ports}}'`; usar somente máquina/rede de
desenvolvimento confiável e não encaminhar essas portas à Internet. O stack foi
parado após as verificações. Não alterar configurações globais do Docker nem
tratar esta configuração de desenvolvimento como implantação de produção.

Migration inicial cria apenas schema privado sem acesso de anon/authenticated.
Seed vazio é intencional: os fixtures de tenants/atores e testes reais de RLS
pertencem à F1. O teste pgTAP de F0 verifica somente a infraestrutura técnica;
não prova isolamento multi-tenant nem autenticação.

```sh
npm run db:stop
```

Para integração na F1, copie `.env.example` para `.env.local` e substitua os
placeholders pelos valores públicos fornecidos pelo CLI local. Não copie a saída
completa do CLI para logs ou documentos: pode conter chaves elevadas. Nenhuma
chave elevada é necessária em F0. O validador público aceita publishable e anon
legada, rejeita secret/service_role; ler o papel do JWT é apenas uma proteção de
configuração, sem verificar assinatura ou conceder acesso.

## CI e próximos ambientes

Workflow `.github/workflows/ci.yml` usa Node fixado, npm ci, verificação web,
Chromium e banco Docker efêmero. Não lê secrets nem publica. Execução hospedada
depende de o repositório ser enviado a um serviço com GitHub Actions habilitado;
validar os comandos localmente não comprova que o workflow já executou remotamente.

Para staging/produção, ainda será necessário criar projetos separados Supabase e
Vercel, definir região/URLs de callback e provedor de e-mail. A Vercel suporta
[Node 24.x](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
mas controla o patch do runtime hospedado. Credenciais administrativas, Auth SSR,
convites e provisionamento restrito serão definidos pela F1. Publicação e migrations
remotas exigem ambiente e autorização próprios, conforme docs/11.
