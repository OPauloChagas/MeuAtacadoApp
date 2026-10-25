# 02 — Regras de negócio

## Identidade e cadastros

RN01. Todo dado comercial pertence a um tenant. Um cliente é local ao fornecedor; documento igual em fornecedores distintos não compartilha pedidos ou dívidas.
RN02. Vínculo ativo informa usuário, tenant, função e, para buyer, cliente. Uma identidade pode ter vários vínculos. Contexto ativo não concede privilégio por si só.
RN03. Tenant, usuário, cliente ou produto inativo impedem novas operações aplicáveis; o histórico continua preservado. Reativação é auditada.
RN04. Não permitir remover/desativar o último administrador ativo do tenant. Serializar a alteração sob lock do tenant para evitar duas desativações concorrentes.
RN05. Não permitir escalada de função pelo próprio usuário nem associação de um comprador a outro cliente sem ação administrativa autorizada.
RN06. Vendedor pode editar contatos/endereço de seus clientes; criação, bloqueio, condição de pagamento, carteira e tabela de preço são administrativos.

## Preços

RN07. Cada cliente tem uma tabela de preço atribuída. Não existe fallback silencioso para uma tabela genérica quando não houver preço válido.
RN08. Versões publicadas de tabela são imutáveis. Vigência em intervalo [início, fim), fim opcional, sem sobreposição para a mesma tabela. Operação usa horário do banco.
RN09. Na submissão, o servidor resolve a tabela vigente e registra descrição, unidade, versão e preço unitário de cada item. Receber SKU/quantidade, nunca confiar em preço/total do browser.
RN10. Se preço ou versão mudou desde a cotação exibida, retornar PRICE_CHANGED com nova cotação; comprador precisa revisar e reenviar. Registrar versão/token da cotação para detectar mudança, sem usá-lo como autorização.
RN11. Na confirmação, manter os preços aceitos na submissão. Se precisar renegociar, rejeitar e gerar novo pedido, sem mudar silenciosamente o histórico.
RN12. Quantidade inteira positiva, mínimo e múltiplo comercial definidos no produto. SKU sem preço vigente ou inativo impede envio. Pedido tem 1 a 200 linhas, SKU sem duplicação; consolidar antes de validar.
RN13. Preço monetário com duas casas; total do item = quantidade × preço. Total do pedido = soma dos itens. Percentuais de comissão até quatro casas. Aritmética decimal exata no servidor/banco; trafegar dinheiro como string decimal.

## Pedidos

RN14. Estados comerciais: `draft → submitted → confirmed → preparing → delivered`. Alternativas: `submitted → rejected`; `draft/submitted → cancelled`; admin pode cancelar `confirmed/preparing` somente conforme RN18. Entregue não é cancelado no MVP.
RN15. Comprador edita seu rascunho e cancela antes da confirmação; vendedor opera somente a carteira. Admin opera todos os clientes do tenant.
RN16. Pedido recebe número sequencial único por tenant; nunca gerar com MAX+1 sem lock. Sequência técnica pode ter lacunas.
RN17. Confirmação é operação única: lock e versão esperada do pedido, validação do cliente/produtos, escolha de vencimentos, snapshot da comissão e criação das parcelas. Repetição retorna o resultado anterior sem duplicar títulos.
RN18. Cancelamento de confirmado/em separação exige admin e ausência de recebimentos líquidos. Se houve baixa, primeiro estorná-la conforme as restrições de comissão; depois cancelar os títulos abertos na mesma transação do cancelamento. Motivo obrigatório. Cancelamento/estorno não apagam fatos.
RN19. Situação financeira é independente do estado comercial. Pedido entregue pode estar aberto; pedido em separação pode estar quitado.
RN20. Representante comercial do pedido é o vendedor atribuído ao cliente na submissão; vendedor só pode enviar por cliente da própria carteira. Pedido sem vendedor é permitido e não gera comissão. Alterações posteriores da carteira não alteram o snapshot do pedido; reassociação excepcional antes de confirmar exige admin e auditoria.

## Títulos e recebimentos

RN21. Confirmação divide o valor total em 1–12 parcelas. Arredondar as primeiras parcelas para duas casas e ajustar a última para preservar o total; rejeitar parcela de valor zero. Datas vêm da condição e primeiro vencimento confirmados, não da configuração futura.
RN22. Título possui valor original imutável e saldo calculado a partir de alocações de recebimentos efetivos. Estados: aberto, parcial, quitado ou cancelado. Vencido é uma condição derivada de saldo positivo e vencimento anterior à data local do tenant.
RN23. Baixa registra recebimento com uma ou mais alocações a títulos do mesmo cliente/tenant; soma das alocações = valor recebido. Não há crédito em conta nem pagamento excedente no MVP.
RN24. Baixa pode ser parcial. Bloquear valores não positivos e alocação maior que o saldo. Travar primeiro os pedidos afetados em ordem de ID e depois seus títulos em ordem de ID; verificar saldo dentro da transação e impedir concorrência com cancelamento. O lock do pedido também serializa a apuração cumulativa da comissão entre parcelas diferentes. Todas as operações que tocam esses recursos seguem a mesma ordem de locks.
RN25. Data de recebimento não pode ser futura e não pode anteceder a confirmação dos títulos. Gravar instante de registro separado da data financeira. Reabrir período contábil não faz parte do MVP.
RN26. Recibo é documento de recebimento gerencial, sem emissão fiscal. Um recibo por recebimento efetivo, com número único por tenant. Gerar sob demanda a partir do lançamento; falha na renderização não duplica nem desfaz a baixa.
RN27. Estorno integral de recebimento exige admin e motivo, gera evento reverso e anula recibo com referência ao original. Alocações e comissões são revertidas juntas. Estorno parcial é evolução. Para preservar o rateio cumulativo sem ajustes retroativos no MVP, somente o recebimento efetivo mais recente de cada pedido afetado pode ser estornado. Se houver recebimentos posteriores em qualquer pedido envolvido, exigir estorno deles primeiro. Usar sequência de processamento por pedido, atribuída sob lock, sem depender apenas de data financeira ou timestamp. Esta restrição é uma proposta de simplificação do MVP.
RN28. Cliente vê os títulos que já existem no fornecedor. Não criar uma segunda escrituração de contas a pagar que possa divergir. Pagamento fora do sistema aparece após baixa pelo fornecedor.

## Comissão

RN29. Uma tabela com versão vigente é atribuída ao vendedor. Percentual padrão de 0–100%, com exceção por produto. Ausência de tabela de vendedor impede confirmar pedido com vendedor; percentual zero é escolha explícita válida.
RN30. Percentuais e base por item ficam congelados na confirmação. Alterar tabela não muda pedido já confirmado.
RN31. Para cada item, comissão total elegível = arredondar(total do item × percentual / 100, 2), half-up para valores positivos. Comissão total do pedido é soma das comissões dos itens.
RN32. Em cada recebimento, calcular ganho acumulado por item = arredondar(comissão total do item × principal acumulado recebido do pedido / total do pedido, 2). Novo ganho = acumulado calculado − ganho anterior efetivo. Na quitação, usar exatamente a comissão total do item. Isso rateia recebimentos proporcionalmente aos itens e evita perda por arredondamento em muitas baixas.
RN33. Comissão disponível = ganhos efetivos − valores pagos. Status agregado do pedido: pendente de recebimento, disponível, parcialmente paga ou paga. Não tratar estes rótulos como estado único de toda a tabela de comissão.
RN34. Pagamento seleciona lançamentos inteiros disponíveis de um vendedor/tenant; pode pagar parte da carteira selecionando parte dos lançamentos. Não há pagamento fracionado de um lançamento no MVP. Lock e vínculo único impedem pagamento duplicado. Registrar data, forma e referência; sem transferência bancária automática.
RN35. Bloquear estorno de recebimento se o pedido tiver qualquer comissão paga efetiva. Admin precisa primeiro registrar reversão do pagamento de comissão, com motivo e recuperação/regularização externa confirmada. Depois pode estornar o recebimento. Isso simplifica a recomposição proporcional; não criar saldo negativo silencioso para vendedor.
RN36. Toda reversão é append-only, referencia o original e só pode ocorrer uma vez. Não editar valor ou excluir pagamento anterior.

## Relatórios e consistência

RN37. Dashboard apresenta separadamente: vendas confirmadas líquidas de cancelamentos (data de confirmação), principal recebido líquido (data financeira), saldo em aberto, vencido e comissão disponível/paga. Não somar vendas e recebimentos como receita única.
RN38. Filtro por período usa campo explícito: confirmação, vencimento ou data financeira. Saldo de posição é atual; posição histórica por data fica fora do MVP. Tela deve rotular isso.
RN39. Idempotência: chave por tenant/ator/operação; guardar hash do payload e resposta na mesma transação. Mesma chave e payload retorna resultado; mesma chave e payload diferente retorna conflito. Constraints de origem continuam impedindo duplicação mesmo com nova chave.
RN40. Auditoria de mutations críticas deve ocorrer na mesma transação. Falha na auditoria aborta a mutation. Não registrar senha, tokens ou segredos.

## Exemplos de cálculo

Pedido: 100 unidades × R$ 2,00 = R$ 200,00; comissão 5% = R$ 10,00. Receber R$ 50,00 libera R$ 2,50. Receber mais R$ 150,00 libera R$ 7,50. Total pago ao vendedor nunca excede R$ 10,00.

Pedido de R$ 100,00 em três parcelas: R$ 33,33, R$ 33,33 e R$ 33,34. Soma dos títulos = total do pedido.

Item com comissão total de R$ 0,01: duas baixas de 50% podem gerar R$ 0,01 e R$ 0,00 por arredondamento acumulado. Soma deve fechar em R$ 0,01; nunca recalcular isoladamente cada baixa e somar R$ 0,02.
