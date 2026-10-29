# 002 — Cadastros e precificação

Status: F2.A–C validadas e publicadas em desenvolvimento em 27/10/2026.
F2.D implementada e validada localmente em 28–29/10/2026, sem publicação.
F2.B/C publicadas por autorização explícita no commit 4a40e9f;
evidências em publicacao-f2bc/tasks.md. Base anterior 4403916 preservada no histórico.
Requisitos da fase: RF05–08, RN01–03/05–13/29–30, RS01–08 aplicáveis e UX01–05.

## Objetivo e sequência

Entregar cadastros e precificação antes de pedidos, com cliente/carteira,
catálogo, versões de preço/comissão e projeção buyer autorizada. Incrementos:
F2.A clientes/carteira; F2.B produtos; F2.C versões/atribuições comerciais;
F2.D catálogo e cotação. Não iniciar automaticamente o próximo incremento.

F2.B está detalhada em [produtos/spec.md](produtos/spec.md), com plano e tarefas
próprios. RF06 inclui SKU/cadastro e foto privada; preço continua em F2.C/D.

F2.C está em [comercial/spec.md](comercial/spec.md), com plano e evidências:
versões imutáveis de preço/comissão, vigência e atribuições, cadastro de condição
de pagamento e valores exatos. F2.D está em [catalogo/spec.md](catalogo/spec.md):
projeções de catálogo/foto e simulação exata por cliente, com revisão de mudança
de preço e seleção somente em memória da página. Configurações iniciais
permanecem adiadas; não iniciar F3 automaticamente.

## Recorte F2.A — clientes e carteira

RF05 parcial, RF04 carteira, RN01–03/05/06 e unicidade de documento por tenant;
RS01–03/05–08, RNF01/02/05/08–10 e UX01/02/04/05 aplicáveis. Admin cria, edita,
bloqueia/reativa clientes e atribui vendedor. Seller consulta somente clientes
ativos atribuídos ao vínculo selecionado e edita apenas contato/endereço.
Buyer consulta somente seu cliente ativo, sem escrita e sem dados internos.

Campos: documento empresarial, nome, contato (email/phone), endereço
(street/number/district/city/state/postal_code), seller opcional e status.
Documento é identificador PJ normalizado para letras/números maiúsculos, único
por tenant; pontuação/espaços não distinguem cadastros. Não há consulta externa,
validação fiscal ou promessa de autenticidade de CNPJ nesta etapa. Identificadores
fictícios existentes são preservados e ganham chave de comparação gerada.

Reatribuir exige seller ativo do mesmo tenant e profile ativo. Vínculo histórico
já atribuído pode permanecer quando desativado, mas não concede acesso; admin
pode remover/substituir explicitamente. Bloqueio conserva registros e corta
as próximas leituras operacionais do seller e o contexto buyer.

Mutations transacionais por RPC dedicado sob RLS, com revisão esperada para
atualizações, UUID idempotente e auditoria atômica. Ator/tenant vêm da sessão e
vínculo revalidado; parâmetros de tenant/ator do formulário não são autoridade.
Role do contexto selecionado limita o caso de uso mesmo se a mesma identidade
tiver outros vínculos. Repetição reautoriza, inclusive carteira/estado atual.

Listas/pesquisa/contadores e seletor de vendedores têm paginação no servidor:
padrão 20, máximo 100; sem cache compartilhado. Contato/endereço novos não têm
SELECT direto por authenticated. Buyer não recebe seller_membership_id,
identidades de outros clientes nem campos comerciais futuros.

## Aceite F2.A

AC01. Admin cria/edita cliente real do próprio tenant; outro tenant é negado.
AC02. Documento equivalente por caixa/pontuação é duplicado no mesmo tenant;
o mesmo documento em tenants diferentes é permitido, inclusive sob concorrência.
AC03. Seller vê/conta/pesquisa somente carteira ativa e edita contato/endereço;
não cria, bloqueia, muda documento/nome ou reatribui carteira.
AC04. Reatribuição/revogação/bloqueio corta o próximo acesso/replay com mesmo JWT.
AC05. Buyer lê somente próprio cliente por página/endpoint/RPC e não escreve;
novos campos não podem ser obtidos por SELECT direto ou projeção ampla.
AC06. Concorrência de revisão não perde atualização; repetição não duplica
cliente/evento; payload diferente conflita; falha de auditoria desfaz a mutation.
AC07. Referência a seller errado/inativo/outro tenant é recusada. Referências
entre entidades mantêm tenant; DML direto/anon continuam negados.
AC08. Busca literal e paginação não vazam nomes/documentos/contatos/contadores
fora do contexto, nem concedem role por metadata/cookie/ID conhecido.
AC09. Cadastro, edição e carteira funcionam em 360/1440 e por teclado, com
estados de envio, erro, vazio e sucesso, sem ações falsas de módulos futuros.
AC10. Migrations sobem do zero e verificações locais reais são registradas.

## Excluído do recorte F2.A (histórico)

Produtos/SKU/imagens/Storage, preços e comissão, condição de pagamento, catálogo,
pedidos/financeiro, importação, exclusão de histórico, implantação/migration
remota. RF05 não é completo até as atribuições comerciais dos próximos recortes.
