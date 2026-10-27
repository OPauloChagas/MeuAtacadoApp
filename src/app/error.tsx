"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main-content" tabIndex={-1}><h1>Não foi possível carregar</h1><p>O serviço está temporariamente indisponível. Tente novamente.</p><button className="button" onClick={reset}>Tentar novamente</button><a className="secondary-link" href="/login">Voltar para entrar</a></main>;
}
