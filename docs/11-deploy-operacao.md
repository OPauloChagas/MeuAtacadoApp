# 11 — Vercel, Supabase e operação

Este é um roteiro de implantação futura. Em 24/10/2026, o diretório foi vinculado
ao projeto Vercel existente `pauls5/meuatacadoapp`, configurado para Next.js e
Node 24.x. A base F0 foi publicada via CLI e validada em
https://meuatacadoapp.vercel.app, estado READY e smoke HTTP 200 aprovado.
O primeiro push foi confirmado em `3ec56d6`, com novo deployment automático READY.
Em 25/10/2026, o projeto Supabase de desenvolvimento foi criado, vinculado e
verificado. Configuração em [Supabase remoto](14-supabase-remoto.md). Evidências em
[integração de plataformas](../specs/000-bootstrap/integracao-plataformas/tasks.md).
A infraestrutura local de F0 está em [ambiente local](13-ambiente-local.md).

## Publicação autorizada de F1/F2.A — 27/10/2026

O responsável solicitou commit e publicação também no Supabase. Destinos
existentes confirmados: Vercel pauls5/meuatacadoapp e Supabase meuatacado-dev
(aonjpucxfkeafoqnyrry). O endereço principal passa a hospedar a versão de
desenvolvimento com esse banco; ambiente isolado de produção real continua
pendente. A autorização atual inclui as quatro migrations versionadas, sem
seeds/fixtures/reset remoto. Evidências em
[publicação da spec 002](../specs/002-cadastros-precificacao/publicacao/tasks.md).

Production na Vercel recebe NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, APP_URL e AUTH_RECOVERY_ENABLED=false.
Não recebe senha PostgreSQL nem chave administrativa. Convites sem SMTP seguem
indisponíveis. O serviço Free recusou alteração de template sem SMTP próprio;
recuperação fica desabilitada na interface e Server Actions, conforme ADR-015.
Após SMTP/template e teste real, habilitar AUTH_RECOVERY_ENABLED=true.
Primeiro tenant/admin será provisionado pelo procedimento restrito de docs/15;
não se criaram conta, senha ou dados empresariais fictícios no remoto.

## Publicação autorizada F2.B/C — 27/10/2026

Commit 4a40e9f enviado à main; migrations 20261027010000/20261027020000
aplicadas após dry-run no mesmo destino de desenvolvimento, sem seed/reset/Vault.
Agora são seis migrations, 17 tabelas FORCE RLS e 40 RPCs do executor, bucket
product-photos privado (3 MB, WebP). Zero usuários Auth/tenants; nenhuma mudança
de Auth/env/plano. Deployment Ready e smoke HTTPS aprovados. Evidências em
[publicação F2.B/C](../specs/002-cadastros-precificacao/publicacao-f2bc/tasks.md).

## Estado histórico da integração F0

As descrições abaixo da F0 são históricas, não o estado atual de Production.

- Configuração Vercel versionada em `vercel.json`: Next.js, instalação `npm ci`,
  build `npm run build`, desenvolvimento `npm run dev`.
- `.vercel/project.json` e `.env.local` são locais e ignorados. O CLI gerou um
  token OIDC ao vincular; seu valor não deve aparecer em documentação ou logs.
- URL e chave publishable do `meuatacado-dev` estão configuradas em Vercel
  Development/Preview e .env.local. Production continua sem variáveis Supabase;
  um projeto de produção separado será definido antes da operação real.
- O pedido explícito de commit, push e deploy autoriza publicar a base F0 em
  `pauls5/meuatacadoapp`, ambiente de produção pela branch `main`. Migrations
  remotas continuam fora desta autorização. A publicação não implementa Auth
  nem as funcionalidades de negócio.
- Deployment publicado pelo CLI: `dpl_FZ5VrASpXoXf2xtG5LMaJyhDZuXg`, a partir do
  commit `6223286`, sem depender de push. O envio posterior de `3ec56d6` foi
  confirmado no GitHub e produziu deployment automático READY; execução do
  workflow GitHub Actions não foi auditada nesta integração.

## Ambientes

- Local: Supabase CLI ou projeto de desenvolvimento dedicado com dados fictícios.
- Staging/preview: banco e Auth separados de produção; preview de PR nunca recebe segredos/banco de produção.
- Produção: projeto Supabase e ambiente Vercel exclusivos, acesso mínimo e domínio validado.

Selecionar regiões próximas entre função web e banco conforme disponibilidade. Confirmar limites atuais dos planos para funções, Storage, e-mail, backups e logs. Não assumir que plano gratuito atende recuperação ou volume do negócio.

## Variáveis previstas

| Nome proposto | Visibilidade | Uso |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Pública | URL do projeto do ambiente |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Pública | Cliente autenticado; segurança depende de grants/RLS |
| SUPABASE_SECRET_KEY | Somente servidor | Auth Admin restrito, quando necessário |
| APP_BASE_URL | Servidor/configuração | URL canônica autorizada |
| DATABASE_URL | Só ferramentas de migration/CI autorizadas | Conexão para migrations, não expor no bundle |

Nomes devem corresponder ao SDK/configuração adotados. Projetos legados podem usar anon/service_role; documentar equivalência e manter chave elevada exclusivamente no servidor. Gerar `.env.example` com placeholders durante F0; ignorar `.env.local` e segredos no Git. Alterar variáveis exige verificar/reimplantar conforme ambiente.

## Auth

Configurar URL canônica e allowlist de callbacks de login/convite/recuperação por ambiente. Nunca liberar redirecionamento arbitrário. Configurar provedor de e-mail e limites antes do piloto; links não podem cair em ambiente diferente. Contas de QA não usam e-mail real de clientes.

## Pipeline sugerido

1. Instalar com lockfile.
2. Lint, typecheck, unidade e build.
3. Banco de integração: aplicar migrations desde zero; seed fictício; testes de RLS/transações.
4. Deploy de preview/staging e E2E.
5. Revisar mudanças de schema e permissões; validar ambiente de destino.
6. Aplicar migrations de produção somente com autorização apropriada; preferir expand/contract compatível com app antigo e novo.
7. Publicar app e executar smoke test por perfil com dados controlados.

Nunca executar reset de banco de produção. Rollback do app não desfaz fatos financeiros nem migration automaticamente. Se a migration não for reversível sem perda, corrigir adiante e preservar os dados.

## Recuperação e monitoramento

- Definir RPO/RTO reais conforme plano e necessidade; documentar responsável e rotina de backup.
- Ensaiar restauração em ambiente isolado e conferir pedidos, parcelas, recebimentos, comissões e arquivos.
- Verificar cobertura separada para objetos do Storage; não presumir que backup PostgreSQL recupere bytes dos arquivos.
- Logs com requestId, caso de uso, tenant interno, resultado, duração e código de erro; sem segredo nem payload pessoal integral.
- Acompanhar erro de login, acesso negado anormal, falhas RPC, latência e conflito financeiro. Alertas com limiares definidos na implantação.
- Rate limit requer mecanismo persistente/serviço adequado, não contador em memória.
- Recibos reconstituíveis por snapshots; se armazenados, bucket privado. Metadados e bytes têm estratégia de recuperação explícita.

## Smoke test do piloto

Login admin/seller/buyer; contexto; catálogo; pedido; confirmação; parcelas; baixa; saldo nos dois portais; recibo; comissão; logout. Testar bloqueio entre tenants e registrar IDs dos fatos de teste para reversão controlada. Confirmar que nenhuma notificação real é enviada por ambiente de teste.
