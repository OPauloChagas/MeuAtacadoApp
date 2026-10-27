# 16 — Autenticação e contexto local (F1.B)

Continuação da spec 001: login, logout, recuperação de senha, seleção de acesso e
navegação mínima por função. Não inclui envio de convites, gestão de usuários,
edição de empresa ou módulos comerciais. A fundação SQL da F1.A permanece local;
o site publicado continua na versão anterior até implantação própria.

## Dependências verificadas em 25/10/2026

| Pacote | Versão exata | Fonte/compatibilidade |
| --- | --- | --- |
| @supabase/ssr | 0.12.7 | [Registry oficial](https://registry.npmjs.org/@supabase/ssr/0.12.7); peer supabase-js ^2.114.0 |
| @supabase/supabase-js | 2.118.0 | [Registry oficial](https://registry.npmjs.org/@supabase/supabase-js/2.118.0); Node >=22, compatível com Node 24.22.1 |
| server-only | 0.0.1 | [Registry oficial](https://registry.npmjs.org/server-only/0.0.1); impede importar infraestrutura privada em Client Components |

Metadados obtidos com npm view version/engines/peerDependencies; versões fixadas
no package.json e package-lock.json. Next/React/TypeScript permanecem nos patches
de F0. Não foi necessário instalar biblioteca de formulários ou novos componentes.
Fontes de implementação: [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[senhas/recuperação](https://supabase.com/docs/guides/auth/passwords),
[segurança Next](https://nextjs.org/docs/app/guides/data-security) e
[API Mailpit](https://mailpit.axllent.org/docs/api-v1/).

## Rodar e revisar

Use Node 24.22.1 e a rede Docker do [guia local](13-ambiente-local.md):

```sh
npm ci
npm run db:start
npm run dev:local
```

Abra http://127.0.0.1:3000/login. `dev:local` injeta URL/chave pública do
CLI no processo Next, junto com APP_URL local. Não modifica .env.local e recusa
servidor Supabase remoto. A atualização F1.C também injeta a credencial elevada
local exclusivamente para o adaptador Auth Admin de convites e SMTP/Mailpit;
ela não participa dos RPCs ou CRUD comum. Veja docs/17. Não
há senha de demonstração fixa. Para revisão manual com acesso autenticado, crie
um usuário fictício no Auth do Studio local, defina sua senha privadamente e use
o provisionamento SQL restrito descrito em docs/15. Nunca faça signup público.

O comando normal `npm run dev` usa a configuração do ambiente: duas variáveis
públicas Supabase e `APP_URL`, origem canônica HTTP local ou HTTPS (sem caminho,
query ou credenciais). Configuração ausente apresenta indisponibilidade nas
telas de Auth; a página inicial e o build continuam funcionando sem credenciais.
Neste workspace .env.local anterior aponta para o remoto; não trocá-lo pelos
valores locais apenas para executar os testes. Use dev:local/test:auth.

Para testar, encerre o dev server e execute:

```sh
npm run check
npm run test:e2e
npm run test:identity
npm run test:auth
npm run db:stop
```

`test:auth` inicia `next start` em 3100 com ambiente local efêmero. Exige build,
Chromium instalado (`npx playwright install chromium`) e Supabase Docker iniciado.
Usa Auth, PostgREST e Mailpit reais; não intercepta as respostas para aprovar
isolamento. Cria atores fictícios via Auth Admin somente no setup de teste, e os
acessos da aplicação usam a chave pública e as sessões desses atores. O runner
não imprime chaves/JWTs e não grava senha ou link de recuperação em artefato
persistente. Saídas temporárias do Playwright são removidas ao terminar; trace,
vídeo e screenshots de sessão ficam desabilitados. Dados fictícios permanecem
somente no volume local até reset.

## Comportamento e limites

Login verifica identidade com getUser e consulta os vínculos atuais por RPC.
Um vínculo abre seu espaço; vários exigem seleção explícita de empresa, função
e cliente; nenhum abre a tela de acesso indisponível com orientação para falar
com o fornecedor. Contexto não é autorização: o cookie contém só membership_id
e cada página/endpoint/action revalida o ator e o vínculo no banco.

Proxy renova a sessão com getClaims e preserva cookies/cache headers; casos de
uso continuam chamando getUser. Cookies de Auth e contexto são HttpOnly,
SameSite=Lax e Secure sob HTTPS. Não há cliente Auth no navegador nem tokens em
localStorage. Queries Supabase e respostas privadas são no-store; login,
confirmação de recuperação, seleção e logout fazem navegação completa para
descartar o estado de navegação anterior. A troca de senha redireciona pelo
servidor depois de remover a sessão, antes de reavaliar a página protegida.

POSTs de contexto/logout verificam Origin contra APP_URL; não aceitam origem
nula, externa ou ausente. Server Actions usam a validação de origem do Next.
Nenhum GET efetua seleção, logout ou consumo de OTP. Os POSTs de contexto aceitam
formulário limitado a 4096 bytes. Páginas normais usam Referrer-Policy same-origin;
a confirmação com token usa no-referrer. A navegação completa após confirmar
renova essa política antes dos próximos formulários nativos.

Menus contêm apenas Início, Trocar acesso, Sair e, para admin, Minha empresa.
Essa última rota apresenta identificação da empresa somente para leitura.
Buyer não recebe dados internos e seller não acessa a projeção administrativa,
mesmo chamando `/api/identity/company` diretamente. `/api/identity/context`
devolve somente o contexto validado; ambos os endpoints retornam erros genéricos
401/403/503 sem encaminhar detalhes do banco, no envelope de docs/08 com
error.code/message/fields e requestId gerado no servidor.

## Recuperação local

O template `supabase/templates/recovery.html` aponta para APP_URL/auth/confirm
com token_hash. O SMTP local captura no Mailpit (54324); nenhum e-mail real é
enviado. GET permite revisar o link sem consumi-lo; o botão POST verifica OTP de
tipo recovery, aceita o prefixo PKCE real e abre a definição de senha. Senha exige
12–128 caracteres e confirmação. Depois de atualizar, a sessão local é removida
e o usuário entra novamente. Link inválido/reutilizado tem resposta genérica.
O pedido de recuperação não informa se a conta existe, inclusive diante de erro
ou limite do provedor.

Antes de implantação remota, configurar APP_URL, origens permitidas, template e
SMTP adequado no ambiente escolhido; aplicar migrations somente com autorização
própria. Conferir limites persistentes por origem/abuso e comportamento HTTPS
na implantação. Esta etapa usa os limites do Auth configurados localmente; não
certifica distribuição de rate limit na Vercel, entrega real de e-mail ou WCAG.
Não executar config push nem migrations remotas a partir deste roteiro local.

Gestão administrativa e convites reconciliáveis foram acrescentados na
[F1.C](17-administracao-convites.md).
Resultados reais deste incremento estão registrados em tasks.md da spec 001;
não considerar F1 completa antes desses fluxos e dos critérios restantes.
