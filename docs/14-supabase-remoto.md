# 14 — Supabase de desenvolvimento remoto

Configurado e verificado em 25/10/2026. Escopo: infraestrutura de F0, sem iniciar
identidade, autorização de negócio ou tabelas comerciais de F1.

## Projeto

| Campo | Valor |
| --- | --- |
| Nome | `meuatacado-dev` |
| Referência | `aonjpucxfkeafoqnyrry` |
| Região | São Paulo (`sa-east-1`) |
| Estado verificado | `ACTIVE_HEALTHY` |
| Banco provisionado pelo serviço | PostgreSQL `17.11.0.003` |
| Organização | `rorbrcxzxmlryygaoolx` |
| Plano | Free, confirmado pelo responsável no painel antes da criação |
| Dashboard | https://supabase.com/dashboard/project/aonjpucxfkeafoqnyrry |
| URL pública | https://aonjpucxfkeafoqnyrry.supabase.co |

Criado pelo Supabase CLI 2.122.0, sem upgrade, tamanho pago, add-ons ou mudanças
no outro projeto da organização. O CLI deste workspace está vinculado ao novo
projeto; estado do vínculo em `supabase/.temp/`, ignorado pelo Git.

## Ambientes

| Destino | Configuração Supabase |
| --- | --- |
| .env.local deste workspace | `meuatacado-dev`, URL e chave publishable |
| Vercel Development | Mesmo projeto de desenvolvimento, duas variáveis públicas do tipo Config |
| Vercel Preview | Mesmo projeto de desenvolvimento, duas variáveis públicas do tipo Config |
| Vercel Production | Nenhuma variável Supabase; publica somente a página F0 |
| Docker local | Continua disponível pelos scripts `db:*` com seleção `--local` onde aplicável |

Variáveis da aplicação: `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Alterações Vercel valem para próximos
deployments; não foi criado outro deployment nesta configuração. O Supabase de
produção será separado antes de operar dados reais.

## Credenciais e configuração local

`.env.local` preserva o token OIDC previamente criado pelo CLI Vercel e acrescenta
somente as duas variáveis públicas do Supabase. Arquivo com permissão 600.

A senha do banco foi gerada criptograficamente ao criar o projeto e guardada em
`.env.supabase.local`, permissão 600, exclusivamente para ferramentas locais. Esse
arquivo não é carregado pelo Next.js. Não copiar essa senha para variáveis
NEXT_PUBLIC, para a Vercel ou para documentos. Ambos os arquivos estão ignorados
pelo Git e pelo upload Vercel. Nenhuma chave secret/service_role foi revelada ou
adicionada ao ambiente da aplicação.

Para outro checkout, autenticar o CLI pelo fluxo `npx supabase login`, obter os
valores públicos desse projeto e preencher `.env.local` usando `.env.example`.
Para consultar o vínculo sem revelar credenciais:

```sh
npx supabase projects list
```

Os scripts de reset/lint locais não devem ser transformados em comandos remotos.
Nenhum `db push`, reset remoto ou migration da aplicação foi executado.

## Verificação realizada

- `projects list`: projeto correto, vinculado e `ACTIVE_HEALTHY`.
- Validador `src/lib/env.ts`: configuração real aceita, sem chave elevada.
- GET `/auth/v1/settings` com publishable no header `apikey`: HTTP 200 e JSON.
- GET `/rest/v1/` com a mesma chave: HTTP 401 e `Secret API key required`,
  comportamento observado de proteção da introspecção. Nenhum grant alterado
  nem chave elevada usada para fazer esse endpoint retornar 200.
- Configurações Development e Preview baixadas diretamente por `vercel env pull`
  em arquivos temporários com permissão 600, comparadas sem exibir valores e
  usadas nas mesmas verificações reais. Arquivos temporários removidos.
- `vercel env ls production`: nenhuma variável; desenvolvimento não foi conectado
  ao destino de produção.
- `npm run check`: lint, tipos, 18 testes unitários e build aprovados.

Esses testes comprovam provisionamento/configuração e acesso público ao serviço.
Não comprovam login, RLS de negócio, isolamento multi-tenant ou transações; estes
continuam em `specs/001-identidade-multitenancy/` e fases seguintes.

Fontes oficiais consultadas: [CLI](https://supabase.com/docs/reference/cli/supabase-projects-create),
[chaves públicas](https://supabase.com/docs/guides/getting-started/api-keys),
[planos e cobrança](https://supabase.com/docs/guides/platform/billing-on-supabase),
[variáveis Vercel](https://vercel.com/docs/cli/env).
