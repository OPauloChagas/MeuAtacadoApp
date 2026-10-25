# Atacado — pacote SDD

Versão 0.1 · 24/10/2026 · Idioma do produto: português brasileiro.
Nome de trabalho: Atacado. Marca final ainda não definida.

## O que é este pacote

SDD significa aqui **Spec-Driven Development: desenvolvimento guiado por especificações**. O pacote também inclui o desenho da solução. A versão inicial continha somente documentos para usar com Codex e Claude no VS Code. A F0 acrescenta a base executável Next.js/TypeScript, migrations técnicas locais e verificações; as funcionalidades comerciais ainda não estão implementadas.

A especificação é a referência do comportamento. Cada entrega segue: especificar → planejar → dividir em tarefas → implementar → validar → atualizar os documentos. Não gerar todo o sistema em uma única execução.

## Objetivo

Sistema web de atacado multi-tenant para fornecedores de produtos como esfihas, empanadas e coxinhas. Funciona no navegador do computador e do celular, com uma única entrada por e-mail e senha e navegação conforme o vínculo autenticado.

Cada fornecedor é um tenant. Administrador e vendedor são funções internas do fornecedor. O comprador acessa somente os dados dos clientes aos quais está vinculado dentro daquele fornecedor. As contas a pagar do comprador são a visão dos mesmos títulos que o fornecedor vê como contas a receber.

## Como usar no VS Code

1. Extraia o ZIP e copie o conteúdo desta pasta para a raiz do repositório. Se já houver `AGENTS.md`, `CLAUDE.md` ou `README.md`, integre o conteúdo preservando as instruções existentes.
2. Leia [premissas e decisões](docs/00-escopo-premissas.md). As escolhas de negócio adicionais são propostas explícitas, não requisitos que você já aprovou.
3. Abra o projeto no VS Code. Codex deve consultar [AGENTS.md](AGENTS.md); Claude deve consultar [CLAUDE.md](CLAUDE.md).
4. Cole o [prompt inicial](prompts/01-iniciar.md) na ferramenta escolhida.
5. Consulte o bootstrap em `specs/000-bootstrap/` e o [guia local](docs/13-ambiente-local.md). A próxima implementação será `specs/001-identidade-multitenancy/`. Revise os artefatos e as evidências antes da próxima fase.
6. Use uma branch por funcionalidade. Se Codex e Claude trabalharem ao mesmo tempo, use branches/worktrees diferentes e integre por revisão; não editem os mesmos arquivos simultaneamente.

As ferramentas podem variar no carregamento automático dos arquivos; o prompt manda lê-los explicitamente.

## Mapa de leitura

| Documento | Conteúdo |
| --- | --- |
| [00 — Escopo e premissas](docs/00-escopo-premissas.md) | MVP, escolhas propostas e dúvidas |
| [01 — Requisitos](docs/01-requisitos.md) | Requisitos funcionais e não funcionais identificados |
| [02 — Regras de negócio](docs/02-regras-negocio.md) | Preço, pedidos, financeiro e comissão |
| [03 — Acesso](docs/03-permissoes.md) | Matriz por função e contexto |
| [04 — UX](docs/04-ux-telas.md) | Menus, jornadas e responsividade |
| [05 — Arquitetura](docs/05-arquitetura.md) | Componentes, fronteiras e organização |
| [06 — Dados](docs/06-modelo-dados.md) | Entidades, vínculos, índices e integridade |
| [07 — Segurança](docs/07-seguranca.md) | Sessão, RLS, RPC e isolamento |
| [08 — Contratos](docs/08-contratos.md) | Operações e erros |
| [09 — Validação](docs/09-validacao.md) | Casos de aceite e testes |
| [10 — Plano](docs/10-plano-entrega.md) | Fases e tarefas rastreáveis |
| [11 — Operação](docs/11-deploy-operacao.md) | Vercel, Supabase e recuperação |
| [12 — Decisões](docs/12-decisoes.md) | ADRs e fontes técnicas |
| [13 — Ambiente local](docs/13-ambiente-local.md) | Versões fixadas, instalação e verificações de F0 |

## Executar a base local

Base F0 publicada: [meuatacadoapp.vercel.app](https://meuatacadoapp.vercel.app).
A página inicial já está disponível; integração Supabase e identidade continuam
pendentes. Essa publicação foi feita pelo CLI Vercel; sincronização GitHub e CI
dependem do primeiro push autenticado.

Use Node.js 24.22.1 LTS e npm 11.11.1 (Node fixado em `.nvmrc` e `.node-version`).

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. A página inicial não exige credenciais.
`npm run check` executa lint, tipos, testes unitários e build. Para smoke em
navegador: `npx playwright install chromium` e `npm run test:e2e` após o build.
Supabase Docker, configuração de ambiente e verificações SQL estão no
[guia local](docs/13-ambiente-local.md); evidências reais em
[tarefas de F0](specs/000-bootstrap/tasks.md).

## Decisões iniciais propostas

- Next.js + TypeScript; hospedagem na Vercel.
- Supabase PostgreSQL, Auth e Storage privado.
- Aplicação modular única; sem microserviços no MVP.
- Sem API .NET separada nesta versão, para concentrar a hospedagem web na Vercel. Se uma API .NET for exigida, registrar nova ADR e definir sua hospedagem antes de desenvolver.
- Valores em BRL; quantidade inteira por unidade de venda (unidade, pacote, caixa ou cento).
- Pedido exige confirmação do fornecedor. Títulos nascem na confirmação.
- Comissão proporcional ao principal recebido, liberada após a baixa; pagamento manual registrado pelo administrador.
- Clientes consultam títulos e recibos; não registram baixas nem realizam pagamento online no MVP.

## O que precisa ser decidido antes do piloto

Validar parcelamento, momento da cobrança, atribuição de vendedor, base de comissão, unidades comerciais e fluxo de entrega. As premissas podem orientar desenvolvimento local e protótipos; não ativar operação financeira real sem sua validação.
