# Tarefas e evidências da publicação

- [x] Confirmar autorização, repositório e destinos existentes.
- [x] Conferir estado remoto inicial: main em 3ec56d6; banco sem tabelas de
  negócio, sem usuários Auth e sem papéis de domínio; Vercel sem env Production.
- [ ] Revisar/stage/commit das implementações, sem segredos.
- [ ] Revisar dry-run e aplicar migrations sem fixtures/seed/reset.
- [ ] Configurar e verificar Auth e variáveis da Vercel.
- [ ] Push e deployment Ready verificados.
- [ ] Smoke HTTPS e evidências finais, commit/push documental.

Verificações locais completas da implementação: tasks.md da spec 002.
Publicação ainda em execução; resultados hospedados não presumidos.

Pré-publicação: `npm run check` aprovado em Node 24.22.1: lint sem warnings,
typecheck, 33 unitários/5 arquivos e build. Revisão encontrou somente a string
fictícia sb_secret_fictional_private no teste de rejeição de segredo; nenhum
segredo real entre os arquivos candidatos. Whitespace de EOF em auth-shell
corrigido durante a revisão de stage.

Dry-run remoto aprovado: quatro migrations 20261024000000–20261027000000,
sem seeds/roles adicionais e com skip-vault. Config diff mínimo prevê alterações
somente de Auth: origem, URLs exatas, cadastro público fechado, senha mínima,
troca de senha segura e assunto da recuperação. Opções não declaradas do
serviço são preservadas; corpo do template será conferido após aplicação.
