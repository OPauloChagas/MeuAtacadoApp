# Prompt de revisão — pode usar o outro agente

```text
Atue como revisor da fase atual. Leia AGENTS.md, a pasta specs da fase e o diff.
Compare o comportamento entregue com os critérios de aceite e as regras de
negócio, acesso e segurança em docs/.

Verifique especialmente tenant e cliente em todas as operações, grants e dono de
RPC, DML direto, colunas sensíveis, cache de sessão, estado do pedido, precisão,
locks, idempotência, estornos e navegação responsiva quando aplicáveis.

Execute as verificações locais que puder e informe exatamente o que executou.
Não modifique o código nesta revisão. Liste problemas concretos com gravidade,
arquivo/linha, cenário de reprodução e critério violado; se não houver achados,
informe lacunas de cobertura e riscos residuais sem inventar defeitos.
```
