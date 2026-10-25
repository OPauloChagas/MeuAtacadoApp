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
