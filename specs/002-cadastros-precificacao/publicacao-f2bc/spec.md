# Publicação F2.B + F2.C

Status: implementações publicadas e verificadas em 27/10/2026; registro
documental final preparado após CI/HTTPS aprovados.

Autorizada pelo pedido de commit e publicação em 27/10/2026. Inclui produtos,
SKU/fotos privadas e versões/atribuições comerciais já validadas localmente.
Não inicia F2.D nem provisiona primeiro tenant/admin.

Destinos conferidos: GitHub OPauloChagas/MeuAtacadoApp, main; Vercel
pauls5/meuatacadoapp (prj_QOTUJdWjPYHOuai609ViwIekUXfl), Node 24.x,
https://meuatacadoapp.vercel.app; Supabase meuatacado-dev,
aonjpucxfkeafoqnyrry, ACTIVE_HEALTHY, sa-east-1, PostgreSQL 17.11.0.003.
O ambiente Production da Vercel continua sendo a publicação de desenvolvimento
conectada a esse banco; não constitui aprovação de piloto com dados reais.

Aceite: commit sem segredos e push fast-forward; aplicar somente migrations
20261027010000/20261027020000 após dry-run; conferir histórico, RLS/grants/RPCs,
bucket privado e ausência de seed; deployment Ready vinculado ao commit e alias;
smoke HTTPS público, redirecionamentos e negações anon nas novas rotas/dados;
registrar resultados reais e limitações de testes autenticados hospedados.

Preservar Auth/SMTP/flags/variáveis existentes, sem reset remoto, seed, convites,
upgrade de plano ou credenciais na aplicação. Recuperação/convites remotos e
primeiro tenant/admin continuam dependentes das configurações posteriores.
