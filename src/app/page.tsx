export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <p className="eyebrow">Atacado · Desenvolvimento</p>
      <h1>Uma base para o seu atacado.</h1>
      <p className="intro">
        Seu espaço para conectar fornecedores e compradores, com acesso
        conforme o vínculo da sua conta.
      </p>
      <section aria-labelledby="status-title">
        <span className="status">Acesso à plataforma</span>
        <h2 id="status-title">Entre no seu espaço</h2>
        <p>
          Utilize o e-mail cadastrado pelo seu fornecedor para acessar sua conta.
        </p>
        <a className="button secondary-link" href="/login">Entrar na minha conta</a>
      </section>
      <footer>Atacado · Aplicativo em desenvolvimento</footer>
    </main>
  );
}
