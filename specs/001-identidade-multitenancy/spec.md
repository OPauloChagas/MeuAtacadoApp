# 001 — Identidade, tenant e acesso

Status: F1 funcional validada localmente. F1.A/F1.B em 25/10/2026 e F1.C em
27/10/2026. Fundação, Auth/contexto, administração e convites entregues com
serviços locais reais. Implantação e piloto não foram executados.
Dependência: F0 — projeto e ambiente local disponíveis.
Requisitos: RF01–04, RF17 parcial, RS01–03/06/07, RN01–06.

## Objetivo

Um usuário entra com e-mail/senha, recebe somente vínculos autorizados e navega no espaço de fornecedor ou comprador. Criar base de isolamento antes dos módulos comerciais.

## Histórias

- Como administrador, quero editar os dados da minha empresa e convidar equipe/compradores.
- Como vendedor, quero entrar na minha carteira sem ver financeiro administrativo.
- Como comprador, quero entrar diretamente no meu portal sem escolher um perfil que não possuo.
- Como usuário com mais de um acesso, quero selecionar empresa/função/cliente de forma explícita.

## Incluído

Provisionamento restrito do primeiro tenant/admin, profiles, memberships, clients mínimos para vínculo buyer, convites reconciliáveis, login/logout/recuperação, seleção de contexto, autorização server-side, RLS/grants, layout responsivo e menus por função.

## Excluído

Pedido, financeiro operacional, CRUD completo de catálogo, signup público e painel de superadmin. Menus de módulos futuros podem ficar ausentes até sua implementação; não criar ações falsas.

## Critérios de aceite

AC01. Dado login válido com um vínculo ativo, abrir dashboard correspondente automaticamente.
AC02. Dado usuário com vários vínculos, listar somente os próprios; escolher um contexto e mostrar empresa/função corretas.
AC03. Dado buyer sem vínculo com cliente X, negar acesso a X mesmo com ID conhecido.
AC04. Dado admin A, negar leitura e alteração de B por interface, endpoint e banco.
AC05. Dado seller, negar chamada direta de operação administrativa.
AC06. Dado vínculo revogado, próxima operação com token válido falha.
AC07. Dados de tenant anterior não aparecem após troca de contexto ou logout/login.
AC08. Login e navegação funcionam em 360 e 1440 px e com teclado.
AC09. Recuperação e convite não revelam senha nem existência de conta a usuário anônimo.
AC10. Duas desativações concorrentes não deixam tenant sem admin.
AC11. Provisionamento/convite repetido não duplica vínculos; falha do provedor tem estado e tentativa reconciliável.
AC12. Pacote de migrations sobe do zero e testes usam dois tenants sem chave de bypass para provar isolamento.

## Recorte F1.A — fundação de identidade no banco

Entrega concluída: 001.1–001.4 e prova de isolamento da camada HTTP/RPC/dados
de 001.9. Requisitos RN01–05, RF02/RF03/RF04 parciais, RS01–03/06/08; AC03–06 e
AC10–12 somente no banco. Sem interface, Auth SSR, recuperação, convites enviados,
Storage ou alteração do Supabase remoto. Não iniciar F2 automaticamente.

Entidades mínimas: tenants, profiles, memberships, customers, invitations,
audit_events e idempotency_keys. Customer contém somente identificação, estado e
vendedor necessário para testar carteira; catálogo, preços e condições são F2.
Profiles não possuem função global; desativação global é restrita ao operador.
Alteração de status do vínculo pelo admin é serializada por lock do tenant.

RPCs de contexto e projeção administrativa derivam auth.uid() e revalidam perfil,
tenant, vínculo e cliente ativos. Mutations limitadas a dados da empresa e status
do vínculo, com chave de repetição, auditoria e proteção do último admin. Não
existe RPC pública de provisionamento. Helpers privados expõem apenas booleanos
baseados no ator atual, com acesso mínimo e sem recursão das policies.

Aceite F1.A: migration local reproduzível; papéis sem login/superuser/BYPASSRLS,
diferentes dos donos das tabelas; JWTs emitidos pelo Auth local para dois tenants;
acesso cruzado, metadata forjada, DML direto e chamadas administrativas indevidas
negados; revogação e repetição reautorizadas; concorrência não remove o último
admin nem perde uma atualização de versão. Provisionamento SQL restrito repetível.

Fixtures são criados somente pelo runner local, com usuários Auth reais e dados
fictícios. A credencial elevada local serve exclusivamente à criação desses
usuários; a prova de acesso usa JWTs normais. Não confundir fixture com produção.

## Recorte F1.B — autenticação e contexto na aplicação

Concluída localmente após F1.A. Cobre RF01/RF02, RN01–03/05, RS01–03/06/07 e
UX01/02/04/05: 001.5–001.7 e testes de interface/cache de 001.9–001.10.
Aceite: login genérico sem revelar conta; logout; recuperação real no capturador
de e-mail local; identidade verificada no servidor; um vínculo selecionado
automaticamente e vários por escolha explícita; nenhum acesso para vínculo
revogado; cookies falsificados não autorizam; troca de contexto/logout não
reutilizam dados do acesso anterior; teclado e larguras 360/1440 funcionais.

Cliente Supabase SSR somente no servidor, com chave pública e getUser antes dos
casos de uso. Proxy renova cookies; a autorização continua em cada página,
action, endpoint e RPC. Cookie HttpOnly de contexto contém somente membership_id
e sempre é revalidado. Sem cache compartilhado ou dados offline; navegação de
troca/logout faz carregamento completo para descartar o Router Cache anterior.

Rotas: /login, /recuperar-senha, /auth/confirm, /definir-senha,
/selecionar-acesso, /sem-acesso, /empresa/inicio, /cliente/inicio e
/empresa/configuracoes (projeção somente leitura para admin). Menus mostram
apenas rotas implementadas. Não inventar indicadores comerciais. Recuperação
usa template local com token_hash; GET apresenta confirmação e POST consome o
token de uso único. Redirecionamentos têm destinos fixos internos.

Sem envio real, convite, gestão de usuários ou edição administrativa nesta
etapa; esses fluxos continuam F1.C. Sem migração/publicação remota. Não avançar
para F2. A ausência de configuração pública apresenta indisponibilidade sem
expor erros internos e preserva a página inicial e o build sem credenciais.

## Recorte F1.C — administração e convites locais

Iniciada em 26/10/2026 e validada localmente em 27/10/2026. RF03/RF04,
RN01–05, RS01–03/06/08 e UX04/05;
001.8 e provas restantes aplicáveis de 001.9–001.11. Admin edita nome/contato/
endereço com revisão esperada e comando idempotente; lista vínculos do tenant e
ativa/desativa pelo RPC existente com proteção do último admin. Função/cliente
do vínculo existente preservados; atribuir outro acesso exige novo convite,
mantendo histórico. Cadastro/carteira comercial continua F2.

Convites admin/seller/buyer exigem cliente ativo do mesmo tenant para buyer.
Solicitação, envio e aceite possuem auditoria e repetição segura. Estados
pending/sent/failed/accepted/cancelled, lease de envio e tentativas persistentes;
falha deixa nova tentativa explícita e não ativa vínculo. Limite persistente de
30 tentativas de envio por tenant/hora, no máximo 5 por convite, validade 7 dias.
Envio interrompido tem lease de 2 minutos e pode ser retomado; SMTP não fornece
exatamente uma entrega, mas aceitação nunca duplica vínculo/auditoria.

Adaptador server-only Auth Admin generateLink + SMTP. Conta nova usa convite e
define senha antes de aceitar; conta existente usa link Auth de acesso sem
resetar sua senha. GET apenas apresenta a confirmação; POST verifica OTP. Aceite
consulta e-mail confirmado/senha definida na identidade real do Auth, não em
metadata/JWT antigo, e valida tenant/cliente/admin aprovador ativos. Aprovação
revogada/cancelada/expirada nega aceite. Convite não reativa perfil ou vínculo
inativo; isso exige operação administrativa explícita. Convites aceitos só podem
ser repetidos pelo mesmo ator ainda autorizado, devolvendo o mesmo fato.

Aceite: empresa/vínculos/convites isolados por tenant em páginas, actions/RPC e
dados; seller/buyer/anon negados; concorrência/repetição/falha SMTP/lease/revogação
testados com Auth e Mailpit locais reais. Sem DML direto autenticado ou chave
elevada no CRUD comum; nenhuma senha/token/link enviado à listagem administrativa.
Segredo Auth Admin/SMTP opcional no exemplo; ausência mostra indisponibilidade de
envio e mantém empresa/vínculos operacionais. Configuração local injetada só no
processo; não mudar .env.local remoto. Sem envio real, deploy ou migration remota.

## Limites e decisões antes de implantação/piloto

Validar identidade visual final e provedor de envio. Usar dados fictícios e configuração local até definição. Não bloquear os testes locais por ausência de um domínio real.
Não há entrega real de e-mail, execução de CI hospedado ou verificação HTTPS
da versão implantada nesta fase. Cadastro comercial/carteira é F2; Storage não
foi usado nas funcionalidades de F1 e será testado quando houver arquivos.
