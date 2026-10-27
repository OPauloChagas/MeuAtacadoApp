import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";
import { findCustomers } from "@/modules/customers/service";
import { listQuery, queryParameters } from "@/modules/customers/contracts";

export const dynamic = "force-dynamic";
export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { context } = await pageContext();
  if (context.role === "buyer") redirect("/acesso-negado");
  const raw = await searchParams;
  let query;
  try { query = listQuery(queryParameters(raw)); } catch {
    return <AccessShell context={context}><h1>Filtros inválidos</h1><p role="alert">Confira a pesquisa e a página informadas.</p><Link prefetch={false} href="/empresa/clientes">Limpar filtros</Link></AccessShell>;
  }
  const { data } = await findCustomers(query);
  const url = (page: number) => `/empresa/clientes?${new URLSearchParams({ q: query.search, status: query.status, page: String(page), pageSize: String(query.pageSize) })}`;
  return <AccessShell context={context}>
    <p className="eyebrow">{context.role === "admin" ? "Cadastros" : "Vendas"}</p><h1>{context.role === "admin" ? "Clientes" : "Minha carteira"}</h1>
    {context.role === "admin" && <Link prefetch={false} className="button" href="/empresa/clientes/novo">Novo cliente</Link>}
    <section aria-labelledby="customer-search-title"><h2 id="customer-search-title">Consultar clientes</h2>
      <form method="get" className="stack" action="/empresa/clientes">
        <div className="field"><label htmlFor="q">Buscar por nome ou documento</label><input id="q" name="q" maxLength={100} defaultValue={query.search} /></div>
        {context.role === "admin" && <div className="field"><label htmlFor="status">Situação</label><select id="status" name="status" defaultValue={query.status}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></div>}
        <button className="button">Buscar clientes</button>
      </form>
    </section>
    <section aria-labelledby="customers-title"><h2 id="customers-title">{data.total} {data.total === 1 ? "cliente encontrado" : "clientes encontrados"}</h2>
      {!data.items.length ? <p>Nenhum cliente encontrado neste acesso com os filtros atuais.</p> : <ul className="admin-list">
        {data.items.map(customer => <li className="admin-item" key={customer.id}><div><strong><Link prefetch={false} href={`/empresa/clientes/${customer.id}`}>{customer.name}</Link></strong><p>{customer.document}</p><span className="status">{customer.status === "active" ? "Ativo" : "Inativo"}</span></div></li>)}
      </ul>}
      <nav className="pagination" aria-label="Paginação de clientes">
        {data.page > 0 && <Link prefetch={false} href={url(data.page - 1)}>Página anterior</Link>}<span>Página {data.page + 1}</span>
        {(data.page + 1) * data.pageSize < data.total && <Link prefetch={false} href={url(data.page + 1)}>Próxima página</Link>}
      </nav>
    </section>
  </AccessShell>;
}
