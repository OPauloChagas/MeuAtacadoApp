# F0 — Integração com Vercel e Supabase

Status: infraestrutura validada em 25/10/2026. Solicitada em 24/10/2026.
Requisito: RNF10. Complemento de infraestrutura; F1 não iniciada.

Em 25/10/2026, o responsável concluiu o login Supabase no terminal e solicitou
continuar a criação. Destino proposto: `meuatacado-dev`, São Paulo (`sa-east-1`),
na organização existente, após confirmação do plano Free e da criação. Vincular esse banco
somente ao desenvolvimento local e aos ambientes Vercel Development/Preview;
o destino Production da Vercel continua publicando a página F0 independente de
banco. Um Supabase de produção separado será definido antes de operação real.

## Objetivo e escopo

Vincular este diretório ao projeto Vercel existente, identificar ou provisionar
um projeto Supabase de desenvolvimento para o app e configurar as variáveis
públicas nos ambientes definidos. O responsável informou não ter criado um
projeto Supabase; verificar organização e disponibilidade gratuita após conectar
a conta. Qualquer custo exige autorização antes de provisionar.
Validar a conexão real sem criar dados, executar SQL ou modificar Auth/Storage.
Preservar os arquivos e a configuração Supabase local já validados.

O pedido inicial autorizou preparar e conectar as plataformas. Em 24/10/2026,
o responsável pediu explicitamente "faça o commit e push e o deploy". Está
autorizada a publicação da base F0 na Vercel, projeto `pauls5/meuatacadoapp`,
ambiente de produção associado à branch `main`, após as verificações locais.
Essa autorização não inclui migrations ou outras mudanças em banco remoto.
Não criar recursos pagos ou trocar cobrança/organização via Marketplace.

## Critérios de aceite

AC01. Identidade Vercel verificada e diretório vinculado ao projeto deste app;
inspeção confirma o nome, preset Next.js e Node 24.x, sem deploy implícito.
AC02. Acesso Supabase autenticado e projeto deste app identificado pelo usuário
ou por consulta autorizada, com ambiente de desenvolvimento/homologação/produção
explicitado antes de configurar destinos remotos.
AC03. URL e chave pública Supabase configuradas somente nos ambientes definidos,
fora do Git. Validação real usa apenas leitura e não imprime credenciais.
AC04. Resultados executados e pendências ficam registrados. Não declarar
integração concluída somente porque os serviços foram encontrados ou sugeridos.
AC05. Commit enviado ao GitHub e deployment Vercel da base F0 fica Ready;
verificar HTTP e conteúdo pt-BR no endereço publicado. Segredos/artefatos locais
não entram no commit. Registrar commit, URL e resultado real, mantendo Supabase
como pendência independente.

## Fora do escopo

Login do aplicativo, convites, entidades multi-tenant, pedidos e financeiro.
DDL/migrations remotas e alteração de projetos de outros sistemas.
