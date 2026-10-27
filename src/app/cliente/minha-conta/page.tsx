import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { CustomerDetails } from "@/components/customers/details";
import { pageContext } from "@/modules/identity/session";
import { findCustomer } from "@/modules/customers/service";

export const dynamic = "force-dynamic";
export default async function MyCustomerPage() {
  const { context } = await pageContext();
  if (context.role !== "buyer" || !context.customer_id) redirect("/empresa/inicio");
  const { data } = await findCustomer(context.customer_id);
  return <AccessShell context={context}><p className="eyebrow">Espaço do comprador</p><h1>Minha conta</h1>
    <section><h2>Cadastro no fornecedor</h2><CustomerDetails customer={data} />
      <p>Para corrigir seu cadastro, entre em contato com o fornecedor.</p>
    </section>
  </AccessShell>;
}
