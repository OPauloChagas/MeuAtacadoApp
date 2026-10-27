import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { CustomerEditor } from "@/components/customers/editor";
import { CustomerDetails } from "@/components/customers/details";
import { pageContext } from "@/modules/identity/session";
import { findCustomer, findCustomerSellers } from "@/modules/customers/service";
import { CustomerProblem } from "@/modules/customers/contracts";

export const dynamic = "force-dynamic";
export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { context } = await pageContext();
  if (context.role === "buyer") redirect("/acesso-negado");
  const result = await findCustomer((await params).id).catch(error => {
    if (error instanceof CustomerProblem && ["ACCESS_DENIED", "VALIDATION_ERROR"].includes(error.code)) return null;
    throw error;
  });
  if (!result) return <AccessShell context={context}><h1>Cliente indisponível</h1><p role="alert">Este cliente não está disponível no seu acesso atual.</p><Link prefetch={false} href="/empresa/clientes">Voltar para a lista</Link></AccessShell>;
  const sellers = context.role === "admin" ? (await findCustomerSellers({ search: "", status: "active", page: 0, pageSize: 20 })).data : undefined;
  return <AccessShell context={context}><p className="eyebrow">{context.role === "admin" ? "Cadastros" : "Minha carteira"}</p><h1>{result.data.name}</h1>
    <Link prefetch={false} href="/empresa/clientes">Voltar para a lista</Link>
    {context.role === "admin" && <Link prefetch={false} href={`/empresa/clientes/${result.data.id}/condicoes`}>Condições comerciais</Link>}
    {(await searchParams).salvo === "1" && <p className="notice" role="status">Cliente salvo com sucesso.</p>}
    <section><h2>Cadastro do cliente</h2><CustomerDetails customer={result.data} /></section>
    <section><h2>{context.role === "admin" ? "Editar cliente" : "Editar contato e endereço"}</h2>
      <CustomerEditor customer={result.data} role={context.role} {...(sellers ? { sellers } : {})} requestKey={randomUUID()} />
    </section>
  </AccessShell>;
}
