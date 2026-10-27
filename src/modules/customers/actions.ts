"use server";
import { selectedContext, AccessFailure } from "@/modules/identity/session";
import { customerRpc } from "./service";
import { customerAdminInput, customerContactInput, positiveRevision, uuidValue, CustomerProblem, customerMessage, type CustomerFormState } from "./contracts";

function failure(error: unknown): CustomerFormState {
  const code = error instanceof AccessFailure ? "ACCESS_DENIED" : error instanceof CustomerProblem ? error.code : "UNAVAILABLE";
  return { status: "error", message: customerMessage(code) };
}
function resultId(value: unknown): string {
  if (!value || typeof value !== "object" || !("customer_id" in value)) throw new CustomerProblem("UNAVAILABLE");
  return uuidValue(value.customer_id);
}
export async function createCustomer(_state: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  try {
    const { client, context } = await selectedContext();
    if (context.role !== "admin") throw new CustomerProblem("ACCESS_DENIED");
    const input = customerAdminInput(form, false);
    const result = await customerRpc(client, "create_customer", { p_membership_id: context.membership_id, p_document: input.document, p_name: input.name,
      p_contact: input.contact, p_address: input.address, p_seller_membership_id: input.sellerId, p_idempotency_key: input.key });
    return { status: "success", message: "", destination: `/empresa/clientes/${resultId(result)}?salvo=1` };
  } catch (error) { return failure(error); }
}
export async function editCustomer(_state: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  try {
    const { client, context } = await selectedContext();
    if (context.role !== "admin") throw new CustomerProblem("ACCESS_DENIED");
    const input = customerAdminInput(form, true), id = uuidValue(form.get("customer_id")), revision = positiveRevision(form.get("revision"));
    await customerRpc(client, "update_customer", { p_membership_id: context.membership_id, p_customer_id: id, p_expected_revision: revision,
      p_document: input.document, p_name: input.name, p_contact: input.contact, p_address: input.address, p_seller_membership_id: input.sellerId,
      p_status: input.status, p_idempotency_key: input.key });
    return { status: "success", message: "", destination: `/empresa/clientes/${id}?salvo=1` };
  } catch (error) { return failure(error); }
}
export async function editCustomerContacts(_state: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  try {
    const { client, context } = await selectedContext();
    if (context.role !== "seller") throw new CustomerProblem("ACCESS_DENIED");
    const input = customerContactInput(form), id = uuidValue(form.get("customer_id")), revision = positiveRevision(form.get("revision"));
    await customerRpc(client, "update_customer_contacts", { p_membership_id: context.membership_id, p_customer_id: id, p_expected_revision: revision,
      p_contact: input.contact, p_address: input.address, p_idempotency_key: input.key });
    return { status: "success", message: "", destination: `/empresa/clientes/${id}?salvo=1` };
  } catch (error) { return failure(error); }
}
