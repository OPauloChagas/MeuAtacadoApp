import { redirect } from "next/navigation";
import { AuthShell } from "@/components/identity/auth-shell";
import { NativeForm } from "@/components/identity/native-form";
import { authenticatedClient, listContexts } from "@/modules/identity/session";
import { roleLabels } from "@/modules/identity/contracts";

export const dynamic = "force-dynamic";
export default async function SelectPage() {
  const client = await authenticatedClient().catch(() => redirect("/login"));
  const contexts = await listContexts(client);
  if (!contexts.length) redirect("/sem-acesso");
  return <AuthShell title="Escolha seu acesso">
    <p>Selecione a empresa e o vínculo que deseja utilizar agora.</p>
    <NativeForm action="/auth/context">
      <fieldset className="context-options"><legend>Acessos disponíveis</legend>
        {contexts.map((context) => <label className="context-option" key={context.membership_id}>
          <input type="radio" name="membership_id" value={context.membership_id} required defaultChecked={contexts.length === 1} />
          <span><strong>{context.company_name}</strong><span>{roleLabels[context.role]}{context.customer_name ? ` · ${context.customer_name}` : ""}</span></span>
        </label>)}
      </fieldset>
      <button className="button">Continuar</button>
    </NativeForm>
    <NativeForm action="/auth/logout"><button className="text-button secondary-link">Sair da conta</button></NativeForm>
  </AuthShell>;
}
