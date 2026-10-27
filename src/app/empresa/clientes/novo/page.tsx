import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AccessShell } from "@/components/identity/access-shell";
import { CustomerEditor } from "@/components/customers/editor";
import { pageContext } from "@/modules/identity/session";
import { findCustomerSellers } from "@/modules/customers/service";

export const dynamic = "force-dynamic";
export default async function NewCustomerPage() {
  const { context } = await pageContext("admin");
  const { data } = await findCustomerSellers({ search: "", status: "active", page: 0, pageSize: 20 });
  return <AccessShell context={context}><p className="eyebrow">Cadastros</p><h1>Novo cliente</h1>
    <Link prefetch={false} href="/empresa/clientes">Voltar para clientes</Link>
    <section><h2>Dados do cliente</h2><CustomerEditor role="admin" sellers={data} requestKey={randomUUID()} /></section>
  </AccessShell>;
}
