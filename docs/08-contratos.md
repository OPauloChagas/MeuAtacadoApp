# 08 — Contratos de operações

Contratos conceituais de aplicação; gerar schemas tipados e integração durante a implementação. Route Handlers externos podem usar `/api/v1`; Server Actions chamam os mesmos casos de uso. RPCs no banco são detalhe de persistência, mas exigem a mesma validação de segurança.

## Convenções

Contexto selecionado por membershipId/tenantId, validado contra o usuário autenticado. buyer não escolhe customerId arbitrário. IDs UUID. Dinheiro string decimal, por exemplo `"150.00"`. Datas `YYYY-MM-DD`; instantes ISO 8601 UTC. Query de lista: page >= 1, pageSize 1–100, filtros e sort em allowlist.

Sucesso: `{ "data": ..., "requestId": "..." }`.
Erro: `{ "error": { "code": "...", "message": "...", "fields": {} }, "requestId": "..." }`.
Lista acrescenta `pagination: { page, pageSize, total }`, com total somente de dados autorizados.

HTTP: 400 entrada malformada, 401 identidade ausente/inválida, 403 operação vedada, 404 recurso inexistente ou fora do escopo, 409 concorrência/preço/estado/idempotência, 422 regra de negócio, 429 limite, 500 falha inesperada sem detalhes internos. Server Actions usam os mesmos códigos de domínio em resultado tipado.

## Operações

| Operação | Entrada essencial | Regra/resultado |
| --- | --- | --- |
| listContexts | sessão | Vínculos ativos do usuário |
| selectContext | membershipId | Revalidar e invalidar estado anterior |
| provisionTenant | dados + primeiro admin; ferramenta restrita | Tenant, convite/vínculo inicial, auditoria |
| updateCompany | dados permitidos + revision | Admin no tenant |
| inviteUser | email, role, customerId se buyer | Admin; idempotência; estado de envio |
| updateMembership | membershipId, função/status/carteira | Admin; último admin protegido |
| create/updateCustomer | dados comerciais | Admin; seller só subset de contato |
| create/updateProduct | SKU e dados | Admin; histórico preservado |
| publishPriceVersion | tabela, vigência, preços | Admin; sem sobreposição |
| publishCommissionVersion | tabela, vigência, percentuais | Admin; sem sobreposição |
| listCatalog/quoteOrder | customer/context, itens quando cotação | Preço aplicável e versão da cotação |
| saveDraft | contexto, customerId quando interno, itens, revision | Autor/cliente autorizado; sem título |
| submitOrder | draftId, revision, quoteVersion, key | Recalcular; snapshot de preço; sem título |
| confirmOrder | orderId, revision, firstDueDate, term, key | Snapshot comissão e parcelas em transação |
| transitionOrder | orderId, revision, targetStatus, reason, key | Estado permitido e carteira |
| cancelOrder | orderId, revision, reason, key | Trava pedido/títulos; regras de cancelamento |
| listReceivables | filtros autorizados | Saldo atual e indicador vencido |
| registerReceipt | customerId, allocations, amount, receivedDate, method, reference, key | Admin; locks, saldo, comissão, recibo |
| reverseReceipt | receiptId, reason, key | Admin; bloquear comissão paga e recebimento posterior efetivo no pedido |
| getReceiptDocument | receiptId | Admin ou buyer dono; documento/estado atual |
| listCommissions | filtros | Admin ou seller próprio |
| registerCommissionPayment | sellerId, entryIds, paidDate, method, reference, key | Admin; lançamentos inteiros disponíveis |
| reverseCommissionPayment | paymentId, reason, key | Admin; regularização externa declarada |
| exportReport | tipo, filtros, formato | Projeção autorizada; limites de tamanho |

## Contratos de persistência entregues em F1.A

Somente no banco local, sem adaptador de aplicação/UI ainda. Contextos usam
`get_my_contexts()` e `get_current_context(p_membership_id uuid)`; a seleção é
validada contra auth.uid(), nunca autorização por UUID enviado. A projeção
`get_tenant_admin(p_membership_id uuid)` exige admin ativo.

`update_tenant(p_membership_id uuid, p_expected_revision bigint, p_legal_name
text, p_trade_name text, p_contact jsonb, p_address jsonb, p_idempotency_key uuid)`
aceita objetos contact/address de até 4096 bytes cada. Não altera documento,
fuso ou estado. Retorna tenant_id, revision e audit_event_id.

`set_membership_status(p_membership_id uuid, p_target_membership_id uuid,
p_status text, p_idempotency_key uuid)` aceita active/inactive, protege o último
admin e retorna membership_id, status, revision e audit_event_id. Não altera
função, identidade, tenant, cliente nem carteira nesta etapa.

Erros SQL de persistência P0001: ACCESS_DENIED, VALIDATION_ERROR, STALE_VERSION,
IDEMPOTENCY_CONFLICT e LAST_ADMIN. O futuro adaptador tipado deve traduzir esses
erros para os contratos de aplicação acima, inclusive STALE_REVISION e
LAST_ADMIN_REQUIRED; as respostas atuais do PostgREST não são o envelope da
aplicação. Não enviar erros internos do banco ao usuário. Provisionamento é
privado e exclusivo do operador; detalhes em docs/15.

## Adaptadores de identidade entregues em F1.B

GET `/api/identity/context` devolve somente o contexto selecionado/revalidado;
GET `/api/identity/company` devolve identificação da empresa somente para admin.
Respostas usam o envelope data/error/requestId descrito acima, com requestId
gerado no servidor e Cache-Control private/no-store. Erros: UNAUTHENTICATED
(401), FORBIDDEN (403), UNAVAILABLE (503), sem detalhes SQL.

POST `/auth/context` aceita somente membership_id como seleção; POST
`/auth/logout` encerra a sessão local. Ambos verificam Origin contra APP_URL e
retornam 303 para destinos internos fixos quando bem-sucedidos. GET não executa
essas operações. Formulários Auth usam Server Actions tipadas e mensagens
genéricas; a documentação local completa está em docs/16.

## Administração e convites entregues em F1.C

Server Actions resolvem o contexto ativo no servidor; campos de tenant/ator no
formulário não concedem autoridade. saveCompany chama update_tenant com revisão e
key. changeMemberStatus chama set_membership_status e preserva o último admin.
Função/cliente de vínculo existente não são reescritos nesta etapa; atribuição de
novo acesso é uma aprovação por convite.

RPCs novas: get_tenant_access(membership,page), request_invitation(membership,
email,role,customer,key), claim_invitation_delivery(membership,invitation,
attempt,retry=false), finish_invitation_delivery(membership,invitation,attempt,
sent,failure_code), cancel_invitation(membership,invitation,key),
get_my_invitation(invitation) e accept_invitation(invitation,display_name,key).
Tipos concretos e defaults estão na migration versionada. Somente os primeiros
cinco exigem admin; os dois últimos exigem identidade/e-mail do destinatário e
aprovação válida. Todos usam executor dedicado sob RLS.

Erros de persistência previstos: ACCESS_DENIED, VALIDATION_ERROR,
IDEMPOTENCY_CONFLICT, INVALID_STATE e RATE_LIMITED; UI traduz em mensagens pt-BR,
sem detalhes Auth/SMTP/SQL. Projeção de acessos pagina 25 vínculos/convites e até
200 clientes ativos. claim retorna dados de envio somente ao admin autorizado.
Tokens Auth permanecem exclusivamente no adaptador e no e-mail do destinatário.
Sem endpoint público para criar tenant/admin. Detalhes e reconciliação em docs/17.

## Clientes e carteira entregues em F2.A

GET /api/customers recebe q/status/page/pageSize; GET
/api/customers/sellers recebe q/page/pageSize. Nesta implementação page é
índice iniciado em 0, pageSize padrão 20/máximo 100; data contém items/total/
page/pageSize (no RPC, page_size). Total é restrito ao contexto. GET /api/customers/{id} retorna
projeção de detalhe; buyer só pode obter seu próprio cliente e não consulta listas.
Todos usam data/error/requestId e private/no-store, sem mutations por GET.

RPCs: list_customers(membership,search,status,page,page_size),
list_customer_sellers(membership,search,page,page_size),
get_customer(membership,customer), create_customer(membership,document,name,
contact,address,seller,key), update_customer(membership,customer,expected_revision,
document,name,contact,address,seller,status,key), update_customer_contacts(
membership,customer,expected_revision,contact,address,key). Tipos e defaults
estão na migration 20261027000000. Ator/tenant vêm da sessão verificada; seller
usa somente a operação de contatos. Escritas retornam customer_id/revision/
audit_event_id. Repetição exige autorização atual antes da resposta persistida.

Buyer recebe somente id/name/document/status/contact/address; admin também
recebe revisão e atribuição de seller. Contact permite email/phone e address
street/number/district/city/state/postal_code; projeção explícita também no RPC.
Erros previstos: ACCESS_DENIED, VALIDATION_ERROR, DOCUMENT_IN_USE,
SELLER_UNAVAILABLE, STALE_VERSION e IDEMPOTENCY_CONFLICT. Adaptadores traduzem
mensagens pt-BR e não expõem SQL. Detalhes em docs/18; preços/condições não foram
implementados neste recorte.

## Exemplo de submissão

```json
{
  "draftId": "UUID",
  "membershipId": "UUID",
  "revision": 3,
  "quoteVersion": "opaque-server-generated-version",
  "idempotencyKey": "UUID"
}
```

O rascunho já contém productId e quantity. Servidor consulta o rascunho autorizado e calcula preço e total. Não confiar em valor monetário adicional que o cliente tente enviar. Retornar número, status, total e nova revision.

## Exemplo de recebimento

```json
{
  "customerId": "UUID",
  "amount": "150.00",
  "receivedDate": "2026-10-24",
  "method": "pix",
  "reference": "referencia-informada-pelo-administrador",
  "allocations": [
    { "receivableId": "UUID", "amount": "100.00" },
    { "receivableId": "UUID", "amount": "50.00" }
  ],
  "idempotencyKey": "UUID"
}
```

`method=pix` registra o meio informado; não implica integração Pix. Formas iniciais: cash, pix, bank_transfer, other. Resposta inclui receiptId, receiptNumber, saldos atualizados e valor de comissão liberado apenas para admin.

## Erros de domínio mínimos

INVALID_CONTEXT, MEMBERSHIP_INACTIVE, FORBIDDEN, RESOURCE_NOT_FOUND, CUSTOMER_BLOCKED, PRICE_UNAVAILABLE, PRICE_CHANGED, INVALID_QUANTITY, INVALID_TRANSITION, STALE_REVISION, RECEIVABLE_OVERPAYMENT, COMMISSION_ALREADY_PAID, IDEMPOTENCY_CONFLICT, LAST_ADMIN_REQUIRED, RECEIPT_REVERSAL_ORDER_REQUIRED.

## Concorrência e repetição

Requisições com mesma chave são serializadas por unicidade/lock e retornam o mesmo fato criado. Mesmo payload com nova chave não pode duplicar confirmação nem comissão de mesma origem. Duas baixas distintas concorrentes só podem consumir o saldo existente. Em timeout após commit, consultar/repetir pela mesma chave; nunca orientar o usuário a criar outra baixa sem conciliação.
