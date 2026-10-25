# 001 — Identidade, tenant e acesso

Status: especificada; não implementada.
Dependência: F0 — projeto e ambiente local disponíveis.
Requisitos: RF01–04, RF17 parcial, RS01–03/06/07, RN01–06.

## Objetivo

Um usuário entra com e-mail/senha, recebe somente vínculos autorizados e navega no espaço de fornecedor ou comprador. Criar base de isolamento antes dos módulos comerciais.

## Histórias

- Como administrador, quero editar os dados da minha empresa e convidar equipe/compradores.
- Como vendedor, quero entrar na minha carteira sem ver financeiro administrativo.
- Como comprador, quero entrar diretamente no meu portal sem escolher um perfil que não possuo.
- Como usuário com mais de um acesso, quero selecionar empresa/função/cliente de forma explícita.

## Incluído

Provisionamento restrito do primeiro tenant/admin, profiles, memberships, clients mínimos para vínculo buyer, convites reconciliáveis, login/logout/recuperação, seleção de contexto, autorização server-side, RLS/grants, layout responsivo e menus por função.

## Excluído

Pedido, financeiro operacional, CRUD completo de catálogo, signup público e painel de superadmin. Menus de módulos futuros podem ficar ausentes até sua implementação; não criar ações falsas.

## Critérios de aceite

AC01. Dado login válido com um vínculo ativo, abrir dashboard correspondente automaticamente.
AC02. Dado usuário com vários vínculos, listar somente os próprios; escolher um contexto e mostrar empresa/função corretas.
AC03. Dado buyer sem vínculo com cliente X, negar acesso a X mesmo com ID conhecido.
AC04. Dado admin A, negar leitura e alteração de B por interface, endpoint e banco.
AC05. Dado seller, negar chamada direta de operação administrativa.
AC06. Dado vínculo revogado, próxima operação com token válido falha.
AC07. Dados de tenant anterior não aparecem após troca de contexto ou logout/login.
AC08. Login e navegação funcionam em 360 e 1440 px e com teclado.
AC09. Recuperação e convite não revelam senha nem existência de conta a usuário anônimo.
AC10. Duas desativações concorrentes não deixam tenant sem admin.
AC11. Provisionamento/convite repetido não duplica vínculos; falha do provedor tem estado e tentativa reconciliável.
AC12. Pacote de migrations sobe do zero e testes usam dois tenants sem chave de bypass para provar isolamento.

## Pendências desta fase

Validar identidade visual final e provedor de envio. Usar dados fictícios e configuração local até definição. Não bloquear os testes locais por ausência de um domínio real.
