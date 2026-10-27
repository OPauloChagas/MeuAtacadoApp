# Publicação F1 + F2.A

Status: execução autorizada em 27/10/2026 pelo pedido explícito de commit e
publicação na Vercel e no Supabase. Este recorte não inicia F2.B.

Destinos confirmados por consulta remota: GitHub OPauloChagas/MeuAtacadoApp,
branch main; Vercel pauls5/meuatacadoapp no endereço existente
https://meuatacadoapp.vercel.app; Supabase `meuatacado-dev`,
ref aonjpucxfkeafoqnyrry, São Paulo, PostgreSQL 17.11.
Nenhum outro projeto ou plano pago será alterado.

O endereço principal da Vercel hospedará esta versão de desenvolvimento,
conectada ao banco de desenvolvimento já existente. Isso não aprova operação
real/piloto nem provisiona banco de produção separado. A restrição histórica
de não aplicar migrations remotas é substituída somente para este destino pelo
pedido atual. Não executar reset/fixtures remotos ou enviar e-mail real.

Aceite: commit revisado sem segredos; push confirmado em main; migrations
versionadas aplicadas sem seed; Auth com cadastro público fechado, URLs exatas
e recuperação disponível somente com e-mail/template compatível; variáveis públicas e origem canônica na
Vercel; deployment Ready e smoke HTTPS das páginas públicas/rotas protegidas;
estado real e limitações registrados. Convites SMTP e primeiro tenant/admin
dependem de configuração explícita posterior, sem credenciais inventadas.

Restrição verificada do serviço: plano Free com provedor padrão recusou a
personalização de template (HTTP 400). Não alterar plano nem inventar SMTP.
Publicar com AUTH_RECOVERY_ENABLED=false: página informa indisponibilidade e
Server Actions não enviam nem consomem recuperação. Login por senha continua
ativo. Ausência da opção ou true preserva o fluxo local já testado; valor
inválido desabilita. Habilitar no remoto somente depois de configurar SMTP,
template compatível e validar o fluxo. Convites também permanecem indisponíveis.
