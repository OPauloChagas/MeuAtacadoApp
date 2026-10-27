# 17 — Administração e convites locais (F1.C)

Incremento iniciado em 26/10/2026, com verificações finais em 27/10/2026. Mantém
a branch de identidade e as alterações anteriores. Não aplica migrations ou
configuração ao Supabase remoto, não publica e não envia e-mails reais.

## Entrega

Administrador edita razão social, nome fantasia, e-mail/telefone de contato e
endereço. Documento é preservado. Revisão esperada impede sobrescrever edição
concorrente; UUID de idempotência permite repetir a mesma solicitação. Toda
alteração autorizada e sua auditoria ocorrem na mesma transação.

Em Usuários e convites, o admin consulta os vínculos do tenant e ativa/desativa
acessos, inclusive o próprio quando houver outro administrador ativo. Não remove
histórico. Função/cliente do vínculo existente são preservados; um novo acesso
é atribuído por convite, sem transformar vínculos históricos. Cadastro de
clientes e atribuição comercial de carteira continuam na F2. A lista possui
páginas de 25 vínculos/convites e até 200 clientes ativos no seletor inicial.

Convites possuem destinatário, função e cliente do mesmo tenant para buyer.
Solicitar repetidamente não duplica aprovação aberta nem vínculo. Há envio,
reenvio explícito, cancelamento e aceite. Conta existente confirma identidade
sem reset automático de senha; conta nova define a própria senha. Senha, token
e link não aparecem para o administrador.

## Dependências verificadas

Nodemailer 10.2.1 ([metadados oficiais](https://registry.npmjs.org/nodemailer/10.2.1),
Node >=20) e @types/nodemailer 8.0.2
([metadados](https://registry.npmjs.org/@types/nodemailer/8.0.2)) são as versões
estáveis consultadas com npm view. Tipos disponíveis usados para o subconjunto
SMTP atual, verificado por compilação e envio real ao Mailpit. Node 24.22.1,
SDKs Supabase e demais versões mantidos no lockfile. Instalação npm informou
zero vulnerabilidades.

Fontes: [Auth Admin generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink),
[SMTP](https://nodemailer.com/smtp),
[claims de autenticação](https://supabase.com/docs/guides/auth/jwt-fields) e
[configuração local](https://supabase.com/docs/guides/local-development/cli/config).

## Modelo e autorização

Migration `20261026000000_administration_invitations.sql` evolui invitations com
validade, tentativa/lease, falha e referência composta ao vínculo aceito. RLS e
grants de DML direto autenticado continuam restritos. Sete RPCs novas pertencem
ao executor dedicado sem login/BYPASSRLS, com search_path vazio. O runner de RLS
agora confere os 12 RPCs públicos da identidade.

Administração e aceite adquirem o mesmo advisory transaction lock de tenant,
antes do lock de linha administrativo. Isso permite serializar destinatários
ainda sem membership com revogação, aprovação e cancelamento. A autorização é
reavaliada depois de esperar o lock. Referências entre convite/cliente/vínculos
preservam tenant por FK composta.

Uma ponte privada selada consulta somente o e-mail confirmado do próprio ator no
Auth. Também comprova senha pronta: Auth cria credencial aleatória no invite,
então hash não vazio é insuficiente. Para identidade convidada sem profile, o
aceite exige amr=password assinado pelo Auth. A aplicação define a senha e faz
login real antes do RPC; metadata editável não serve como prova. Perfil existente
representa identidade já provisionada/onboardada. Perfil inativo não é reativado
pelo convite. E-mail de JWT antigo não substitui o valor atual em auth.users.

O aprovador precisa continuar admin ativo; tenant e cliente aplicáveis também.
Destinatário diferente, convite pendente/cancelado/expirado, perfil inativo ou
vínculo aceito depois revogado negam leitura/aceite/replay aplicáveis. Um vínculo
inativo existente exige reativação administrativa, nunca um novo convite como
atalho. O aceite cria profile/membership quando necessários, registra auditoria,
estado e resposta idempotente numa transação. Falha na auditoria reverte o fato.

## Entrega de e-mail e reconciliação

O servidor faz claim autorizado com JWT do admin. O banco limita uma tentativa
em andamento por convite, lease de 2 minutos, máximo de 5 tentativas por convite
e 30 por tenant em uma hora. Contadores são persistentes; não dependem da memória
da instância web. O executor lê apenas tenant/action/occurred_at da auditoria,
sob RLS, para esse limite. Nenhuma listagem de auditoria é exposta ao navegador.

Após claim, um adaptador server-only chama Auth Admin generateLink e envia por
SMTP. Usa invite para conta nova e magiclink para existente; esse detalhe não é
devolvido ao admin. A chave elevada nunca consulta/escreve tabelas de negócio.
Finalizar a tentativa usa novamente o JWT e a autorização do admin. Falha fica
failed com código limitado, sem erro bruto do provedor. Se o processo terminar
antes de confirmar o resultado, pending/lease permanece e pode ser retomado após
2 minutos. Uma tentativa antiga não pode concluir por cima de uma nova.

SMTP não oferece transação com PostgreSQL nem entrega exatamente uma vez. Em
resultado incerto, repetir pode enviar outro e-mail; o estado avisa essa condição.
Message-ID deriva da tentativa. Reenvio explícito de sent gera novo link, sujeito
aos mesmos limites; repetir a solicitação original não reenvia automaticamente.
Vínculo e auditoria de aceite continuam únicos, inclusive com requisições
simultâneas. Convite expirado deve ser cancelado antes de criar outra aprovação.

## Configuração e execução local

Variáveis opcionais exclusivas do servidor: SUPABASE_SECRET_KEY, SMTP_HOST,
SMTP_PORT, SMTP_FROM, SMTP_USER e SMTP_PASSWORD. Exemplos contêm só placeholders.
Ausência desabilita envio na UI; empresa e controle de vínculos continuam
operacionais. Não usar prefixo NEXT_PUBLIC_ para segredo, nem copiar a saída
completa de supabase status para logs.

```sh
npm run db:start
npm run db:reset
npm run dev:local
```

O reset destrói somente dados Docker locais. dev:local injeta URL/chave pública
e a chave elevada local em memória do processo, esta última exclusivamente para
o adaptador Auth Admin, junto do Mailpit SMTP em 127.0.0.1:54325. Nenhum valor é
gravado em .env.local e os valores remotos existentes são preservados. Não há
senha fixa de demonstração; usuário manual pode ser criado no Auth Studio local
e provisionado pelo procedimento restrito de docs/15.

Template do convite é texto simples; envio aceita um destinatário explícito e
links de origem APP_URL. GET /auth/invite não consome o token; POST confirma
invite/magiclink, faz navegação completa e abre /convites/{id}. Aceite seleciona
o contexto validado. Rotas privadas não usam cache compartilhado; botões têm
estado de envio/erro e campos não secretos preservam edição em caso de erro.

Para verificar, encerre o servidor dev e execute:

```sh
npm run check
npm run test:identity
npm run test:auth
npm run test:admin
npm run test:e2e
npm run db:stop
```

Auth limita logins em janela de cinco minutos. Para suítes repetidas, reiniciar
somente o Auth local limpa seus contadores temporários; os limites configurados
não foram alterados. CI executa db:reset entre suítes reais para isolamento.
test:admin para/reinicia somente o Mailpit local ao provar falha SMTP, restaura-o
em finally, não usa mocks para aprovar entrega e remove artefatos temporários.
Não executar esse teste em stack compartilhada com uma operação real de e-mail.

## Evidências e continuação

Resultados reais e limites estão nas tarefas da spec 001. Nenhuma execução
local comprova CI hospedado, entrega real, rate limit de abuso distribuído na
Vercel, políticas HTTPS hospedadas ou conformidade WCAG completa. Implantação,
credenciais e testes no ambiente escolhido exigem sua etapa própria.
Não iniciar pedidos/financeiro automaticamente; a fase seguinte do plano é F2.
