import Link from "next/link";
import { dashboardPath, roleLabels, type AccessContext } from "@/modules/identity/contracts";
import { NativeForm } from "./native-form";

export function AccessShell({ context, children }: { context: AccessContext; children: React.ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="workspace">
    <header className="workspace-header">
      <a className="brand" href={dashboardPath(context.role)}>Atacado<span className="brand-dot">.</span></a>
      <div className="active-context"><strong>{context.company_name}</strong><span>{roleLabels[context.role]}{context.customer_name ? ` · ${context.customer_name}` : ""}</span></div>
      <NativeForm action="/auth/logout"><button className="text-button">Sair</button></NativeForm>
    </header>
    <div className="workspace-body">
      <nav aria-label="Menu principal" className="workspace-nav">
        <a href={dashboardPath(context.role)}>Início</a>
        {context.role !== "buyer" && <Link prefetch={false} href="/empresa/clientes">{context.role === "admin" ? "Clientes" : "Minha carteira"}</Link>}
        {context.role !== "buyer" && <Link prefetch={false} href="/empresa/produtos">Produtos</Link>}
        {context.role === "admin" && <><Link prefetch={false} href="/empresa/tabelas-preco">Tabelas de preço</Link><Link prefetch={false} href="/empresa/comissoes">Comissões</Link><Link prefetch={false} href="/empresa/condicoes-pagamento">Condições de pagamento</Link></>}
        {context.role === "buyer" && <Link prefetch={false} href="/cliente/minha-conta">Minha conta</Link>}
        {context.role === "admin" && <a href="/empresa/configuracoes">Minha empresa</a>}
        {context.role === "admin" && <a href="/empresa/usuarios">Usuários e convites</a>}
        <a href="/selecionar-acesso">Trocar acesso</a>
      </nav>
      <div className="workspace-content" key={context.membership_id}>{children}</div>
    </div>
  </main>;
}
