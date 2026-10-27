import { fieldLabels, contactKeys, addressKeys, type CustomerDetail } from "@/modules/customers/contracts";

export function CustomerDetails({ customer }: { customer: CustomerDetail }) {
  return <dl>
    <dt>Nome do cliente</dt><dd>{customer.name}</dd>
    <dt>Documento empresarial</dt><dd>{customer.document}</dd>
    <dt>Situação</dt><dd>{customer.status === "active" ? "Ativo" : "Inativo"}</dd>
    {[...contactKeys, ...addressKeys].map(key => {
      const value = key in customer.contact ? customer.contact[key as keyof typeof customer.contact] : customer.address[key as keyof typeof customer.address];
      return value ? <div key={key}><dt>{fieldLabels[key]}</dt><dd>{value}</dd></div> : null;
    })}
  </dl>;
}
