# 03 — Matriz de acesso

Toda permissão exige tenant e vínculo ativos. Para buyer, exige cliente ativo e vínculo daquele cliente. Para seller, carteira vigente. Não existe permissão global por um nome de função encontrado no navegador.

| Recurso/operação | Administrador | Vendedor | Comprador |
| --- | --- | --- | --- |
| Dados da empresa | Ler/editar | Ler dados públicos | Ler dados públicos do fornecedor |
| Usuários e vínculos | Gerenciar no tenant | Próprio perfil básico | Próprio perfil básico |
| Clientes | Gerenciar | Ler carteira; editar contato/endereço | Ler próprio cadastro comercial |
| Atribuir carteira/tabela/prazo | Sim | Não | Não |
| Produtos | Gerenciar | Ler catálogo | Ler catálogo disponível |
| Tabelas de preço | Gerenciar/publicar | Consultar preço da carteira | Somente preço aplicável no catálogo |
| Tabelas de comissão | Gerenciar/publicar | Não; vê seu resultado | Não |
| Criar pedido | Qualquer cliente do tenant | Cliente da carteira | Cliente do vínculo ativo |
| Confirmar/rejeitar/separar/entregar | Sim | Somente carteira | Não |
| Cancelar rascunho/enviado | Sim | Carteira | Próprio pedido |
| Cancelar confirmado | Sim, conforme regra | Não | Não |
| Contas a receber e baixas | Todas operações do tenant | Não | Não |
| Contas a pagar | Não se aplica | Não se aplica | Ler próprios títulos |
| Recibos | Gerar/ler no tenant | Não | Ler dos próprios recebimentos |
| Comissões apuradas | Todas | Somente próprias | Não |
| Registrar/reverter pagamento | Sim | Não | Não |
| Relatórios financeiros | Tenant completo | Só relatório de vendas próprias | Extrato próprio |
| Auditoria | Ler no tenant | Não | Não |

## Contexto após login

1. Validar identidade pelo Auth no servidor.
2. Consultar vínculos atuais no banco, sem confiar em `user_metadata` editável.
3. Sem vínculo: tela de acesso indisponível com contato do fornecedor, sem liberar catálogo privado.
4. Um vínculo: selecionar automaticamente e abrir dashboard correspondente.
5. Vários vínculos: seletor com empresa, função e cliente quando aplicável. Mostrar somente vínculos do usuário.
6. Toda troca de contexto força nova consulta, invalida o estado/cache do contexto anterior e reconstrói os menus.

O contexto pode ser guardado em cookie protegido e em memória de interface, mas a autorização deve revalidar o vínculo no servidor/banco. Não persistir dados comerciais em cache offline compartilhado.

## Casos de bloqueio

- Buyer altera customerId/tenantId na URL, body, RPC ou filtro: nenhum dado retornado ou alterado.
- Seller envia comando de baixa diretamente: negado mesmo sem botão na tela.
- Admin do tenant A tenta convidar usuário para B: negado.
- Usuário desativado mantém JWT válido: próxima operação negada pela consulta de vínculo.
- Usuário troca contexto durante checkout: carrinho anterior não pode ser enviado no novo contexto.
- Relatório exportado ou recibo não pode ser acessado por URL pública ou UUID conhecido.

Não expor custo interno, percentuais de comissão, dados de outros clientes ou contatos privados em payloads do comprador. RLS controla linhas; selecionar colunas/DTOs de forma explícita também é obrigatório.
