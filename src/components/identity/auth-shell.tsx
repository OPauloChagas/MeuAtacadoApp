export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="auth-main">
    <Link href="/" className="brand" aria-label="Atacado, página inicial">Atacado<span className="brand-dot">.</span></Link>
    <div className="auth-card"><p className="eyebrow">Seu acesso ao atacado</p><h1>{title}</h1>{children}</div>
    <footer>Atacado · Fornecedores e compradores no mesmo lugar</footer>
  </main>;
}
export function Unavailable() {
  return <p role="status" className="notice">O acesso está temporariamente indisponível. Tente novamente mais tarde.</p>;
}
import Link from "next/link";
