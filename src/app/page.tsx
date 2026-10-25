export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <p className="eyebrow">Atacado · Desenvolvimento</p>
      <h1>Uma base para o seu atacado.</h1>
      <p className="intro">
        O ambiente inicial está pronto. O acesso de fornecedores e compradores
        será disponibilizado na próxima etapa.
      </p>
      <section aria-labelledby="status-title">
        <span className="status">Fase inicial</span>
        <h2 id="status-title">Estrutura em preparação</h2>
        <p>
          Esta versão contém a base técnica do aplicativo. Login, cadastros e
          operações comerciais ainda não estão disponíveis.
        </p>
      </section>
      <footer>Atacado · Aplicativo em desenvolvimento</footer>
    </main>
  );
}
