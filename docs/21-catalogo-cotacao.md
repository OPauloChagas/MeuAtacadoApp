# 21 — Catálogo e simulação (F2.D)

Implementado localmente em 28–29/10/2026 na branch feat/002-catalog-quotes,
preservando cf4d60e. Publicação autorizada em 29/10/2026: commit 5bb0856,
migration remota, CI e deployment Ready/HTTPS conferidos; evidências em
[publicação F2.D](../specs/002-cadastros-precificacao/publicacao-f2d/tasks.md).
Especificação, plano, evidências locais e limites em
[catálogo](../specs/002-cadastros-precificacao/catalogo/tasks.md). A versão publicada
inclui F2.D no ambiente de desenvolvimento existente, sem dados reais/piloto.

## Comportamento

Comprador acessa `/cliente/catalogo` pelo menu; vê somente produtos ativos com
preço publicado vigente da tabela ativa atribuída ao cliente do vínculo.
Fornecedor abre `/empresa/clientes/{id}/catalogo` pelo cadastro do cliente:
admin no tenant, vendedor somente na carteira do vínculo selecionado. Cliente
inativo não permite consulta. Sem tabela/versão válida, mostrar indisponibilidade;
não usar outra tabela como fallback. SKU sem preço não entra em contadores,
busca por nome/SKU, filtro literal de categoria nem download de foto.

Listas têm página de 20, máximo 100. Cada cartão mostra unidade comercial,
embalagem, mínimo/múltiplo e preço aplicável em BRL. Quantidade vazia não seleciona.
Simular recalcula tudo no banco: consolidar SKUs duplicados, quantidades inteiras
positivas, 1–200 linhas de entrada e agregado até 1000000 por produto. Aplicar
mínimo/múltiplo após consolidar. Preços, linhas e total usam numeric exato e
trafegam como strings. Total acima de numeric(18,2) é AMOUNT_LIMIT.

Seleção e resultado ficam em memória na página; busca, paginação, navegação,
troca de acesso e saída descartam valores. Há aviso explícito. Não há carrinho
persistente, reserva de preço ou pedido enviado. Documento restaurado por
bfcache recarrega para revalidar acesso. Simulação com vínculo da aba diferente
do contexto atual é negada, mesmo quando o usuário tem ambos os vínculos.

## Cotação e segurança

As três RPCs list_catalog/get_catalog_photo/quote_catalog são STABLE, com
search_path fixo, RLS e executor dedicado sem bypass ou propriedade de tabelas.
Helpers booleanos selados usam o reader existente com grants mínimos de colunas.
Nenhum SELECT/DML adicional de authenticated; nenhuma projeção de comissão.
DTOs explícitos omitem tabela/versão comercial, caminhos Storage e dados internos.

Cotação usa snapshot e relógio da instrução SQL. Fingerprint SHA256 considera
ator, vínculo, cliente/condições e itens resolvidos; não concede acesso nem é
assinatura de aceite. Token anterior diferente retorna PRICE_CHANGED/HTTP409
com nova cotação; a interface mostra os novos valores e pede revisão. Repetir
a leitura não cria fatos, auditoria ou chaves de idempotência. F3 deverá
revalidar preços/autorização ao submeter e persistir snapshots/idempotência.

Foto retorna referência opaca produto/foto pelo RPC. Servidor monta o caminho
com tenant revalidado, baixa pelo JWT comum e devolve WebP private/no-store/
nosniff. Reautoriza após baixar; não usa URL pública/assinada nem otimizador
compartilhado. Storage revalida produto e preço visível para buyer; assinatura,
listagem e escrita continuam negadas. Conhecer UUID/caminho não libera bytes.

## Contratos

GET `/api/catalog`: q, category, page, pageSize e customerId para fornecedor;
buyer usa implicitamente seu cliente e não pode selecionar outro. GET de foto:
`/api/catalog/{productId}/photo`, com customerId quando aplicável. Respostas
privadas, sem cache compartilhado; erros em envelope error/requestId.

POST `/api/catalog` verifica Origin e `X-Atacado-Context` igual ao vínculo da
sessão revalidada. Header só detecta aba obsoleta, não autoriza acesso. JSON
limitado a 65536 bytes: items com somente product_id/quantity; customerId e
expectedToken opcionais. Não aceitar tenant, preço, total ou ator do cliente.
RPC usa p_membership_id validado e parâmetros p_customer_id/p_items/
p_expected_token; SQL/defaults na migration 20261028000000.

## Operação

Sem dependências novas; Node24.22.1/npm11.11.1 e lockfile mantidos. Para validar:

```sh
npm run db:start
npm run db:reset
npm run check
npm run test:catalog
npm run db:lint
npm run db:test
npm run db:stop
```

Runner recusa Supabase remoto e não altera .env.local. Testes usam somente
Auth/PostgREST/Storage Docker e atores fictícios; CI inclui a suíte. Não há
aprovação de operação financeira, pedido persistido, escala representativa,
WCAG completa ou outros browsers. Primeiro admin/SMTP continuam adiados.

Fontes oficiais conferidas em 28/10/2026:
[snapshot STABLE PostgreSQL](https://www.postgresql.org/docs/17/xfunc-volatility.html),
[controle de acesso Storage](https://supabase.com/docs/guides/storage/security/access-control).
