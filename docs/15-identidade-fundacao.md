# 15 — Fundação local de identidade (F1.A)

Primeiro incremento de `specs/001-identidade-multitenancy/`, em 25/10/2026.
Entrega o banco e sua autorização; login na interface, Auth SSR, recuperação,
convites e navegação continuam pendentes na F1. A página F0 não mudou.
Nenhuma migration desta etapa foi aplicada ao Supabase remoto.

## Modelo e acesso

Migration `20261025000000_identity_foundation.sql`: tenants, profiles,
memberships, customers mínimos, invitations (somente estrutura), audit_events e
idempotency_keys. As sete tabelas usam ENABLE/FORCE RLS. Profiles são globais;
referências entre entidades do tenant usam FKs compostas. Customer ainda não
contém condições comerciais, endereço ou contato da F2.

`authenticated` tem apenas SELECT em profiles próprios, memberships autorizados
e customers permitidos pela função: admin do tenant, seller da carteira ou buyer
do cliente ativo. DML direto é proibido. Os dados internos do fornecedor são
acessados por projeção administrativa; contextos incluem somente nome público,
empresa, função e cliente. Metadata editável do Auth não concede função.

RPCs públicas, sempre com identidade derivada de `auth.uid()`:

| RPC | Comportamento |
| --- | --- |
| `get_my_contexts()` | Lista os vínculos ativos do próprio ator |
| `get_current_context(p_membership_id)` | Valida uma seleção própria e ativa |
| `get_tenant_admin(p_membership_id)` | Dados internos da empresa para admin |
| `update_tenant(...)` | Atualiza nome/contato/endereço com revisão esperada |
| `set_membership_status(...)` | Ativa/desativa vínculo do mesmo tenant |

Os comandos exigem UUID de idempotência, reautorizam antes de devolver uma
resposta anterior e gravam auditoria na mesma transação. Reusar chave com outro
payload falha. Lock do tenant serializa alterações e protege o último admin com
perfil ativo. Atualizações concorrentes da empresa exigem a revisão atual.
Falhar a auditoria desfaz a alteração e a chave de repetição.

RPCs pertencem a `atacado_executor`, sem login, superuser ou BYPASSRLS e sem ser
dono das tabelas. Helpers booleanos usam leitor restrito para evitar recursão de
políticas. A ponte privada `request_user_id()` apenas chama `auth.uid()`; a
exceção de propriedade e seus limites estão na ADR-011. Nenhum desses papéis
possui CREATE nos schemas ao final da migration.

## Reproduzir localmente

Use Node/npm fixados no [guia local](13-ambiente-local.md), Docker e a rede
`meuatacado-local`. Não precisa de credenciais remotas nem de `.env.local`.

```sh
npm run db:start
npm run db:reset
npm run db:lint
npm run db:test
npm run test:identity
npm run check
npm run db:stop
```

`db:reset` apaga somente o banco Docker local deste projeto. O runner recusa
endpoint remoto, obtém configuração do CLI sem imprimir chaves e cria usuários
Auth fictícios com senha aleatória em memória. A chave elevada local serve só
para criar esses usuários; leituras e RPCs usam chave pública e JWTs emitidos no
login real. SQL de operador prepara fixtures e verifica integridade/catálogo;
as provas de RLS são feitas por HTTP com JWTs normais.

`supabase/fixtures/identity.sql` recebe UUIDs desses usuários e pode ser repetido
com os mesmos parâmetros sem duplicar vínculos. Cada execução do runner cria
um conjunto independente, incluindo dois tenants para isolamento e um terceiro
para provar duas primeiras tentativas simultâneas de provisionamento. Dados de
teste ficam no volume local até o próximo reset. Nunca usar esses fixtures em
ambiente remoto. Repetir a suíte muitas vezes em cinco minutos pode atingir o
limite local de login; mantivemos o limite configurado de 30.

O provedor de e-mail local precisa estar habilitado para login por senha:
`[auth.email].enable_signup=true`; o cadastro público permanece bloqueado por
`[auth].enable_signup=false`. O runner verifica ambos. A semântica do parâmetro
foi conferida na [configuração oficial](https://supabase.com/docs/guides/local-development/cli/config)
e no [repositório da CLI](https://github.com/supabase/cli/issues/7055).

## Provisionamento restrito

`private.provision_tenant(p_key uuid, p_admin_user_id uuid, p_document text,
p_legal_name text, p_trade_name text, p_timezone text)` é executável somente pelo
operador SQL postgres, com usuário Auth já existente. O fuso padrão é
America/Sao_Paulo. Valida os parâmetros, cria tenant/primeiro admin, grava
auditoria de plataforma e mantém a resposta idempotente numa tabela privada.
O runner demonstra a chamada no banco local; não há endpoint público.

Não se adicionou senha de banco nem chave administrativa ao ambiente da aplicação.
SQL de operador é uma fronteira confiável e não deve ser usado para contornar os
comandos administrativos, inclusive a proteção do último admin. Desativação
global de perfil e estado do tenant ainda são operações restritas ao operador;
não há fluxo público para elas nesta etapa.

## Continuação da F1

Atualização: Auth SSR, login/logout/recuperação, seleção de contexto e menus
mínimos foram entregues na [F1.B](16-autenticacao-contexto.md). A lista original
abaixo descreve a continuação prevista ao concluir F1.A; o estado atual está nas
tarefas da spec. Gestão administrativa/convites e arquivos continuam pendentes.

Integrar Auth SSR com identidade verificada no servidor; implementar login,
logout, recuperação, seleção de contexto e menus responsivos; manutenção de
usuários/convites reconciliáveis; testar troca de contexto, cache, teclado e
arquivos quando houver. Os testes atuais não aprovam esses fluxos. Resultados
locais e critérios cobertos estão nas [tarefas da spec](../specs/001-identidade-multitenancy/tasks.md).
