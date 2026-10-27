import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";
import { companyDetails } from "@/modules/identity/company";
import { randomUUID } from "node:crypto";
import { CompanyEditor } from "@/components/identity/admin-forms";

export const dynamic = "force-dynamic";
export default async function CompanyPage({searchParams}:{searchParams:Promise<{salvo?:string}>}) {
  await pageContext("admin");
  const result = await companyDetails().catch(() => redirect("/selecionar-acesso"));
  return <AccessShell context={result.context}><p className="eyebrow">Administração</p><h1>Minha empresa</h1>
    {(await searchParams).salvo==="1"&&<p className="notice" role="status">Dados da empresa atualizados.</p>}
    <section><h2>Identificação do fornecedor</h2><dl>
      <dt>Razão social</dt><dd>{result.company.legalName}</dd>
      <dt>Nome fantasia</dt><dd>{result.company.tradeName}</dd>
      <dt>Documento</dt><dd>{result.company.document}</dd>
    </dl></section>
    <section><h2>Editar dados da empresa</h2><CompanyEditor company={result.company} requestKey={randomUUID()}/></section>
  </AccessShell>;
}
