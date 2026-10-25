# 00 — Escopo, premissas e pendências

## Requisitos informados

- Web app multi-tenant, responsivo em computador e celular.
- Fornecedor: empresa, usuários administrador/vendedor, clientes, produtos, tabelas de preço e de comissão.
- Administrador: contas a receber, baixa, relatórios, recibos e pagamento de comissões.
- Comprador: fazer pedido com itens e quantidades; acompanhar contas a pagar.
- Login e senha, identificação de perfil pelo acesso e menus correspondentes.
- Interface moderna, clean, simples e fácil de navegar.
- Hospedagem Vercel e banco Supabase.

## Terminologia

| Termo | Significado |
| --- | --- |
| Tenant | Empresa fornecedora; fronteira de isolamento |
| Usuário | Identidade global em Supabase Auth |
| Vínculo | Permissão de uma identidade em determinado fornecedor |
| Cliente | Cadastro comercial do comprador dentro de um tenant |
| Comprador | Usuário com vínculo de cliente e acesso ao portal |
| Título | Parcela a receber do fornecedor, vista como a pagar pelo cliente |
| Baixa | Registro de recebimento, sem transferência bancária pelo sistema |

Dois espaços de experiência: fornecedor e comprador. Três funções iniciais: `admin`, `seller`, `buyer`. Não criar um quarto perfil financeiro no MVP.

## Premissas propostas para implementação

P01. Cliente cadastrado como pessoa jurídica; documento único por fornecedor. Pessoa física é evolução.
P02. Mesmo e-mail pode ter vínculos com vários fornecedores. Mesmo comprador pode representar mais de um cliente. Um contexto ativo é um vínculo específico; se houver apenas um, entrar automaticamente; se houver vários, oferecer seletor após o login.
P03. Administrador vê tudo do seu fornecedor. Vendedor gerencia pedidos de clientes atribuídos e lê somente suas comissões; não executa baixas nem altera preços de tabela.
P04. Cadastro de novas empresas feito por provisionamento restrito do operador da plataforma. Não existe painel de superadministrador nem signup público de empresas no MVP. Cadastro da empresa inclui seus dados e edição pelo admin.
P05. Administrador convida equipe/compradores. Senha definida pelo próprio usuário através do Auth; nunca exibida ao administrador.
P06. Produtos vendidos em quantidades inteiras de sua unidade comercial. Caixa com 50 unidades é um SKU comercial próprio; sem conversão automática de estoque.
P07. Pedido enviado vai para análise; fornecedor confirma ou rejeita. Confirmação gera parcelas.
P08. Comissão ganha sobre principal efetivamente recebido, sem juros, multa ou tarifa. Regra percentual por vendedor com exceção por produto.
P09. Condição à vista ou até 12 parcelas, intervalos em dias e primeiro vencimento informado na confirmação. Sem parcelamento de cartão.
P10. Registro manual de recebimentos e pagamento de comissões; sem integração Pix, boleto ou banco.
P11. Sem estoque, produção, emissão fiscal, logística automática, marketplace, assinatura SaaS ou modo offline no MVP.
P12. Sem descontos, frete, juros e multa no MVP: total é soma dos itens. Mudanças exigem especificação de base financeira e comissão.
P13. Estorno de recebimento integral e em ordem inversa de processamento por pedido; comissão já paga precisa de reversão prévia do pagamento.
P14. Desativação em vez de exclusão de cadastros referenciados. Histórico permanece consultável ao autorizado.

## Perguntas de negócio para validar

| Questão | Padrão proposto | Impacto se mudar |
| --- | --- | --- |
| Cobrar ao confirmar ou entregar? | Confirmar | Geração de títulos e caixa |
| Comissão por venda ou recebimento? | Recebimento | Conciliação e estornos |
| Comissão sobre preço cheio ou líquido? | Principal dos itens | Base e arredondamento |
| Vendedor acompanha todos os clientes? | Somente carteira atribuída | Permissões e RLS |
| Comprador pode cancelar depois de confirmado? | Solicita ao fornecedor, admin executa | Fluxo e financeiro |
| Quantidades fracionárias? | Inteiras por SKU comercial | Modelo e validações |
| Preço diferente por cliente? | Uma tabela atribuída por cliente | Seleção e visibilidade |
| Estoque/produção são necessários agora? | Não | Ampliação relevante de escopo |

## Fora do escopo não significa inexistência futura

Registrar demandas adicionais no backlog. Não simular integrações ausentes na interface como se estivessem funcionando. As escolhas são suficientes para especificar um MVP, sujeitas à validação antes do piloto.
