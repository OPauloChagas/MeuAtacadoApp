# 01 — Requisitos identificados

## Funcionais

| ID | Requisito | Aceite resumido |
| --- | --- | --- |
| RF01 | Autenticar por e-mail/senha, sair e recuperar senha | Sessão válida, erro genérico e recuperação sem revelar existência da conta |
| RF02 | Resolver vínculos e contexto | Login abre menu correto; múltiplos vínculos permitem seleção segura |
| RF03 | Cadastrar/provisionar empresa e editar dados | Razão social, nome fantasia, documento, contato e endereço; isolamento |
| RF04 | Administrar usuários | Convidar, atribuir função/carteira e desativar sem remover histórico |
| RF05 | Cadastrar clientes | Dados comerciais, endereço, contato, vendedor, tabela e condição de pagamento |
| RF06 | Cadastrar produtos | SKU, nome, descrição, categoria, unidade de venda, conteúdo da embalagem, foto opcional e ativo |
| RF07 | Manter tabelas de preço | Nome, versão, vigência e preços por SKU; cliente recebe tabela determinada |
| RF08 | Manter tabelas de comissão | Versão, vigência, percentual padrão e exceções por produto; atribuídas ao vendedor |
| RF09 | Criar/enviar pedidos | Comprador escolhe itens e quantidade; servidor recalcula tudo |
| RF10 | Operar pedidos do fornecedor | Criar para cliente, confirmar, rejeitar e registrar separação/entrega |
| RF11 | Consultar contas a receber | Filtros por cliente, vencimento, situação, pedido; totais conciliáveis |
| RF12 | Baixar recebimentos | Total/parcial, data, forma e referência; transação e proteção contra duplicação |
| RF13 | Emitir recibo | Número único no tenant, pagador, recebedor, data, valor e títulos vinculados |
| RF14 | Apurar e registrar pagamento de comissão | Liberado após recebimento; selecionar lançamentos e registrar pagamento externo |
| RF15 | Relatórios financeiros | Títulos, recebimentos e comissões; filtros, CSV e impressão/PDF |
| RF16 | Portal de contas a pagar | Comprador vê apenas seus títulos, saldo e recibos autorizados |
| RF17 | Painel por função | Admin: financeiro; vendedor: carteira/pedidos; comprador: pedido e vencimentos |
| RF18 | Auditoria | Eventos de preço, permissão, pedido, baixa, estorno e comissão com ator/data |

## Não funcionais

| ID | Requisito / alvo verificável |
| --- | --- |
| RNF01 | Layout sem rolagem horizontal da página em 360, 390, 768, 1024 e 1440 px; tabelas podem ter contêiner de rolagem quando apropriado |
| RNF02 | WCAG 2.2 AA como objetivo de interface: teclado, foco, labels, contraste e anúncio de erros |
| RNF03 | Meta inicial p95 de operações usuais do servidor até 1,5 s, excluindo rede do usuário e geração de relatório; medir, não presumir |
| RNF04 | Meta de LCP até 2,5 s em ensaio móvel documentado; usar imagens otimizadas e carregamento progressivo |
| RNF05 | Listas paginadas no servidor, padrão 20 e máximo 100 itens; nunca carregar todo o tenant no navegador |
| RNF06 | Cálculos exatos e transações; preço histórico imutável após confirmação |
| RNF07 | Recuperação testada em ambiente isolado; metas de RPO/RTO definidas conforme plano contratado antes do piloto |
| RNF08 | Logs estruturados com requestId e sem senha, token ou payload com dados pessoais desnecessários |
| RNF09 | pt-BR, BRL, datas de calendário locais e instantes UTC; timezone por tenant, padrão America/Sao_Paulo |
| RNF10 | Ambiente local/staging/produção separado; migrations e lockfile versionados |

## Regras de segurança rastreáveis

RS01: isolamento por tenant no banco e em toda operação.
RS02: comprador restrito aos clientes dos vínculos ativos; vendedor restrito à carteira.
RS03: autorização por operação, não somente por página.
RS04: nenhum campo financeiro interno exposto a comprador.
RS05: escritas críticas idempotentes e auditadas.
RS06: alterações de vínculo bloqueiam o acesso na próxima operação, mesmo com JWT ainda válido.
RS07: relatórios, arquivos, filtros, contadores e pesquisas respeitam a mesma autorização.
RS08: toda mutation de negócio deve validar entradas, estado atual e concorrência.
