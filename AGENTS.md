# Instruções compartilhadas para agentes

## Objetivo e fonte da verdade

Implemente o sistema descrito no README e em `docs/`. Antes de alterar código, leia `docs/00-escopo-premissas.md`, `docs/02-regras-negocio.md`, `docs/03-permissoes.md`, `docs/05-arquitetura.md`, `docs/07-seguranca.md` e a especificação da tarefa atual.

O pedido atual do responsável pelo produto prevalece. Se mudar requisito, atualize a especificação e a ADR correspondente. Não trate propostas deste pacote como aprovações definitivas de negócio. Evite implementar funcionalidades fora do escopo para preencher lacunas.

## Ciclo de trabalho

1. Identifique os requisitos RF/RN/RS/UX cobertos e leia os critérios de aceite.
2. Examine o repositório e suas instruções locais. Não substitua código ou arquivos existentes sem necessidade.
3. Crie ou atualize `spec.md`, `plan.md` e `tasks.md` da funcionalidade.
4. Implemente uma etapa pequena e completa. Não inicie a fase seguinte automaticamente.
5. Execute as verificações adequadas. Anexe comando, resultado e limitações às tarefas.
6. Atualize somente as tarefas concluídas. Teste não executado não é teste aprovado.
7. Entregue resumo do comportamento, arquivos, verificações e pendências.

## Invariantes

- Autorização no servidor e banco; menu oculto não é controle de acesso.
- Derive ator da sessão verificada. Valide tenant, vínculo ativo, função e cliente em toda operação.
- Jamais aceite tenant, preço, total, comissão ou usuário enviados pelo navegador como verdade.
- Nenhuma chave secreta/admin do Supabase no navegador, logs ou repositório.
- Leituras autenticadas sem cache compartilhado entre usuários/tenants.
- Escritas financeiras e comerciais críticas somente pelas operações transacionais autorizadas; proibir DML direto do papel autenticado.
- Toda referência entre entidades do negócio deve preservar tenant por chave estrangeira composta.
- Valores monetários com aritmética decimal exata; não use ponto flutuante para cálculo financeiro.
- Pedidos confirmados, baixas e pagamentos são históricos; correção por operação explícita/auditada, sem apagar registros.
- Idempotência e controle de concorrência são parte da implementação de pedidos, baixas e comissão.

## Código e interface

TypeScript estrito. Interface pt-BR; identificadores de código e banco em inglês. Organize por domínio. Valide entradas no servidor, inclusive em Server Actions/RPC. Adote componentes acessíveis, layout mobile-first e estados de carregamento, vazio, erro e sucesso.

Use versões estáveis compatíveis verificadas no início da implementação; registre versões e lockfile. Não copie comandos antigos sem verificar a documentação oficial. Não invente credenciais. Gere `.env.example` somente com nomes e placeholders.

## Banco e testes

Migrations versionadas em `supabase/migrations/`. Dados de exemplo fictícios. Testes de RLS usando JWTs de atores reais de teste, sem bypass. Verifique acesso direto aos endpoints de dados e RPC, além da interface.

Mudança de permissão, dinheiro ou transação exige testes positivos, negativos, de concorrência e repetição pertinentes. Não marque a fase como concluída com dados mockados se exige integração real.

## Limites operacionais

Instalar dependências locais e rodar testes faz parte da tarefa de implementação. A criação deste pacote não autoriza publicar, executar migrations em produção, enviar convites reais ou efetuar pagamentos reais. Na etapa de implantação, confirme o ambiente e a autorização aplicável. Pagar comissão no MVP significa registrar um pagamento externo já realizado, não transferir dinheiro.
