# 04 — UX, navegação e telas

## Princípios

UX01. Uma ação principal por tela, linguagem direta: “Novo pedido”, “Registrar recebimento”, “Ver parcelas”.
UX02. Mobile-first, fundo neutro, cartões claros, espaçamento consistente e uma cor primária. Cor proposta: verde-petróleo; identidade final a definir.
UX03. Valores em BRL, datas dd/MM/aaaa, status com texto e cor; ícones sempre com rótulo acessível.
UX04. Campos obrigatórios visíveis, erro junto ao campo, resumo de erro em formulário extenso. Preservar dados quando falhar.
UX05. Estados de loading, vazio, erro, sucesso e acesso negado em cada tela. Botão desabilitado durante envio ajuda a UX, mas idempotência é obrigatória no servidor.
UX06. Confirmar operações financeiras mostrando cliente, títulos, valores e consequência. Não pedir confirmação a cada cadastro simples.

## Navegação por perfil

| Perfil | Desktop | Celular |
| --- | --- | --- |
| Administrador | Lateral: Visão geral, Pedidos, Clientes, Produtos, Preços, Comissões, Financeiro, Relatórios, Empresa/Usuários | Barra: Início, Pedidos, Financeiro, Mais; demais módulos em Mais |
| Vendedor | Lateral: Início, Pedidos, Minha carteira, Catálogo, Minhas comissões | Barra: Início, Pedidos, Clientes, Mais |
| Comprador | Menu: Início, Fazer pedido, Meus pedidos, Contas a pagar, Minha conta | Barra: Início, Catálogo, Pedidos, Contas |

Cabeçalho sempre mostra empresa e contexto ativo. Meu perfil, troca de contexto e sair ficam acessíveis pelo menu de conta. Comprador não vê menus administrativos vazios.

## Inventário de telas

F1.B implementa /login, /recuperar-senha, /auth/confirm (confirmação POST),
/definir-senha, /selecionar-acesso, /sem-acesso e os dois espaços de início.
/empresa/configuracoes inicialmente apresentava identificação; F1.C acrescenta
edição dos dados permitidos e /empresa/usuarios com vínculos, convites,
tentativas e cancelamento. /auth/invite confirma identidade via POST e
/convites/{id} permite revisar e aceitar o acesso, com senha para conta nova.
Menus mostram somente páginas disponíveis; indicadores comerciais e ações de
módulos futuros não são simulados. O inventário abaixo descreve o produto final
pretendido, não uma afirmação de que todas as telas já existem.

| Tela/rota sugerida | Conteúdo e ação principal |
| --- | --- |
| `/login` | E-mail, senha, mostrar senha, entrar, recuperar acesso |
| `/recuperar-senha`, `/auth/callback`, `/definir-senha` | Fluxo seguro de recuperação/convite e retorno validado |
| `/selecionar-acesso` | Lista de vínculos autorizados |
| `/empresa/inicio` | Indicadores por função, pedidos recentes e pendências |
| `/empresa/configuracoes` | Dados comerciais, contato, endereço, timezone e logo |
| `/empresa/usuarios` | Convites, função, estado, carteira e vínculo de cliente |
| `/empresa/clientes` | Busca por nome/documento, filtros, cadastro e detalhe |
| `/empresa/clientes/novo` | F2.A: cadastro exclusivo do admin |
| `/empresa/clientes/{id}` | F2.A: admin edita cadastro/carteira; seller somente contato/endereço autorizado |
| `/cliente/minha-conta` | F2.A: leitura do próprio cadastro, sem carteira ou campos internos |
| `/empresa/produtos` | Catálogo administrativo e cadastro por SKU |
| `/empresa/precos` | Tabelas, versões, vigência e editor de itens |
| `/empresa/comissoes` | Configuração, apuração e pagamentos; seller vê somente sua consulta |
| `/empresa/pedidos` | Lista por status/cliente/data; detalhe com linha do tempo |
| `/empresa/financeiro` | Receber, baixas, detalhe, recibos e estornos |
| `/empresa/relatorios` | Tipo, filtros, totais e exportação |
| `/cliente/inicio` | Fazer pedido em destaque, pedidos ativos e próximos vencimentos |
| `/cliente/catalogo` | Busca, categoria, preço aplicado e seletor de quantidade |
| `/cliente/carrinho` | Itens, unidade comercial, quantidades, total e revisão |
| `/cliente/pedidos` | Lista e detalhe dos próprios pedidos |
| `/cliente/contas` | Em aberto, vencidas e pagas; detalhe/recibos |
| `/conta` | Dados pessoais básicos, senha e sair |

Rotas são organização visual; o servidor autoriza cada operação separadamente. Rascunho é persistido no servidor por tenant/cliente/autor; não depende apenas de localStorage.

## Jornadas principais

**Pedido do comprador:** login → contexto → catálogo com preço aplicável → quantidade → carrinho → revisar → enviar → confirmação com número e estado “Aguardando confirmação”. Se preço mudou, mostrar diferenças e exigir nova revisão.

**Atendimento do fornecedor:** abrir enviados → detalhe → revisar itens e condição → confirmar → visualizar parcelas → separar → entregar. Mostrar situação financeira em bloco separado do estado de entrega.

**Recebimento:** Financeiro → filtrar cliente → selecionar títulos → informar valor/data/forma → revisar alocações → registrar → mostrar saldo atualizado e abrir recibo. Em erro de rede, repetir com a mesma chave de idempotência.

**Comissão:** apuração por vendedor → conferir disponível → selecionar lançamentos → registrar pagamento externo → comprovante gerencial. Identificar claramente que o sistema registra o pagamento.

## Responsividade e acessibilidade

- Largura mínima 360 px; testar 390, 768, 1024 e 1440 px, portrait e landscape quando relevante.
- Em celular, substituir tabelas operacionais por cartões com rótulos. Relatórios densos podem usar contêiner rolável, sem estourar a página.
- Formulários: uma coluna no celular, duas em tela larga quando a ordem de leitura se mantiver.
- Controles de toque com alvo proposto de 44 × 44 px, fonte de entrada 16 px, labels persistentes.
- CTA do carrinho fixo no rodapé com safe-area e espaço reservado; não cobrir campos nem navegação.
- Gavetas e modais com foco controlado, fechamento acessível, scroll adequado e teclado virtual testado.
- Navegação por teclado, foco visível, aria-live para resultado de ações, erros associados aos campos.
- Pesquisa com debounce; filtros e paginação preservados ao voltar de um detalhe.
- Mostrar unidade explicitamente: “Caixa com 50 · R$ 75,00/caixa”. Não deixar o cliente interpretar preço de caixa como unitário.

## Definição visual de pronto

Fluxos principais concluídos por comprador e admin em computador e celular, sem zoom obrigatório, botões cortados, menus indevidos ou perda de contexto. Registrar capturas e resultados de acessibilidade em staging com dados fictícios.
