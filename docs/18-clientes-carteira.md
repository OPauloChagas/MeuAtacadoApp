# 18 — Clientes e carteira local (F2.A)

Primeiro incremento de `specs/002-cadastros-precificacao/`, em 27/10/2026.
Entrega cadastro e carteira antes de catálogo/precificação. RF05 é parcial:
tabela de preço e condição de pagamento ficam para F2.C. Não há produtos,
pedidos, operações financeiras ou alteração do Supabase remoto nesta entrega.

## Comportamento

Admin consulta clientes, cria/edita documento, nome, contato/endereço, bloqueia
ou reativa e atribui vendedor. Seller tem Minha carteira, somente com clientes
ativos atribuídos ao vínculo selecionado, e altera apenas contato/endereço.
Buyer tem Minha conta para leitura de seu cadastro no fornecedor, sem formulário
de escrita, carteira ou dados comerciais internos.

Pesquisa literal por nome/documento, contadores e paginação respeitam o contexto.
Padrão 20 itens e máximo 100 por página, inclusive para opções de vendedores.
Não há carregamento integral do tenant no navegador nem pesquisa por curingas
SQL. Admin pode filtrar ativos/inativos/todos; seller consulta apenas ativos.

Documento empresarial é normalizado em letras/números maiúsculos para comparação
única por tenant. Caixa, espaços, ponto, barra e hífen não permitem duplicação.
O mesmo documento em fornecedores diferentes é permitido. Isso não constitui
validação fiscal/autenticidade de CNPJ nem consulta a órgão externo. Os documentos
fictícios legados são preservados; uma coluna gerada fornece a chave de comparação.
Se um legado contiver equivalentes duplicados, a migration falha sem mesclar ou
apagar registros automaticamente, exigindo tratamento explícito antes de prosseguir.

Nova atribuição exige seller ativo do tenant e profile ativo. Se um vendedor
histórico for desativado, a atribuição pode permanecer, mas não concede acesso.
Admin pode remover ou substituir. Reatribuição corta leitura/replay do antigo
seller; bloqueio corta acesso operacional do seller e contexto do buyer na
próxima operação. Não se excluem registros nem vínculos históricos.

## Modelo e segurança

Migration `20261027000000_customers_portfolio.sql`: contact/address JSON públicos
do cadastro, revision, updated_at e document_key gerado, com índice único
tenant/document_key. FKs compostas e proteção de tenant imutável são preservadas.

authenticated perde SELECT amplo de customers; mantém somente id/tenant/document/
name/status/created_at sob RLS para compatibilidade com a identificação de F1.
Contato, endereço, carteira e colunas futuras não são acessíveis por SELECT *.
RPCs fazem projeção explícita, inclusive das chaves dentro dos JSONs, sem
encaminhar objetos desconhecidos ao buyer. A RLS continua global ao usuário;
casos de uso também limitam o papel do vínculo selecionado. Ter outro vínculo
admin não autoriza uma chamada escolhendo contexto seller.

Seis RPCs públicas, de dono atacado_executor sem bypass/dono de tabela:

| RPC | Acesso |
| --- | --- |
| list_customers | Admin no tenant; seller na carteira ativa |
| get_customer | Admin; seller atribuído/ativo; buyer do cliente do contexto |
| list_customer_sellers | Admin; opções ativas do tenant, paginadas |
| create_customer | Admin; ID/tenant derivados no servidor/banco |
| update_customer | Admin; revisão, estado e nova atribuição validados |
| update_customer_contacts | Admin ou seller autorizado; somente contato/endereço |

A aplicação usa Server Actions específicas para admin e seller; nenhum papel,
tenant, preço ou usuário enviado no formulário concede autoridade. Mutations
compartilham o advisory lock de tenant da F1 e depois travam o cliente. A espera
é seguida por nova validação de ator/carteira. Atualização exige revisão atual;
repetição reautoriza antes de devolver resposta anterior. Auditoria e chave de
idempotência são atômicas com a escrita. Duas edições não perdem atualização e
dois cadastros equivalentes não contornam a unicidade.

Campos contact permitidos: email/phone. Address: street/number/district/city/
state/postal_code. Tamanhos e objetos são validados também no RPC; campo extra
ou tipo inválido é recusado. Seller não recebe parâmetros de documento/nome/
status/carteira no RPC de contatos. Chave administrativa não participa do CRUD.

## Rotas e execução

Rotas implementadas: /empresa/clientes, /empresa/clientes/novo,
/empresa/clientes/{id}, /cliente/minha-conta. Endpoints GET privados:
/api/customers, /api/customers/{id}, /api/customers/sellers. Respostas usam
data/error/requestId, no-store e erros genéricos; não há mutation por GET.
Campos não secretos preservam edição quando a solicitação falha. Troca de
contexto/logout e sucesso de escrita fazem navegação completa para descartar
estado anterior, conforme F1.

Use Node 24.22.1, Docker e a rede descrita em docs/13. Não é necessário segredo
novo. Versões exatas/lockfile mantidos, sem dependências novas. Em 27/10/2026,
metadados oficiais de next@16.4.3, supabase-js@2.118.0 e ssr@0.12.7 foram
reverificados: Node >=20.9/>=22, React 19 e peer supabase-js ^2.114 compatíveis
com o runtime e patches fixados. Fontes: registry npm e documentação oficial de
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[privilégios](https://www.postgresql.org/docs/17/ddl-priv.html) e
[locks](https://www.postgresql.org/docs/17/explicit-locking.html).

```sh
npm run db:start
npm run db:reset
npm run dev:local
```

Reset apaga apenas o banco Docker local. dev:local preserva .env.local remoto;
o procedimento de criar identidade/admin manualmente continua restrito conforme
docs/15. Não há senha fixa de demonstração. Após encerrar o dev server:

```sh
npm run check
npm run test:customers
npm run test:identity
npm run test:auth
npm run test:admin
npm run test:e2e
npm run db:stop
```

O runner de customers recusa endpoint remoto, injeta configuração local somente
no processo e remove credencial elevada/SMTP do app para comprovar que CRUD usa
sessão normal. Setup cria atores Auth locais reais; SQL de operador prepara e
inspeciona fixtures, não aprova isolamento por bypass. Requests de prova usam
JWTs emitidos por login. Sem traces/vídeos/artefatos persistentes com credenciais.
Limite de login do Auth permanece configurado; reinícios locais entre suítes
ou db:reset de CI isolam contadores temporários de testes repetidos.

## Continuação

Evidências reais em tasks.md da spec 002. CI hospedado, implantação, testes HTTPS
remotos e auditoria WCAG completa não são aprovados por testes locais. A próxima
entrega é F2.B (produtos/SKU); versões de preços/comissão e catálogo vêm depois.
Nenhum botão ou valor fictício representa funcionalidade comercial ainda ausente.
