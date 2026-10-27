"use server";
import { AccessFailure } from "@/modules/identity/session";
import { adminSession, commercialRpc } from "./service";
import { kind, id, optionalId, integer, activeValue, formText, calendarDate, decimal, record, tablePath, versionPath, message, CommercialProblem, type FormState } from "./contracts";
const failure = (error: unknown): FormState => ({ status: "error",message: message(error instanceof AccessFailure ? "ACCESS_DENIED" : error instanceof CommercialProblem ? error.code : "UNAVAILABLE") });
const success = (destination: string): FormState => ({ status: "success",message: "",destination });
export async function saveTable(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), k = kind(form.get("kind")), target = optionalId(form.get("id"));
 const r = record(await commercialRpc(s,"save_commercial_table",{ p_kind: k,p_id: target,p_expected_revision: target ? integer(form.get("revision")) : null,p_name: formText(form,"name"),p_active: activeValue(form.get("active")),p_idempotency_key: id(form.get("key")) }));
 return success(`${tablePath(k)}/${id(r.id)}?salvo=1`); } catch (e) { return failure(e); }
}
export async function saveVersion(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), k = kind(form.get("kind")), target = optionalId(form.get("id"));
 const r = record(await commercialRpc(s,"save_commercial_version",{ p_kind: k,p_table_id: id(form.get("table_id")),p_id: target,p_expected_revision: target ? integer(form.get("revision")) : null,p_start_on: calendarDate(form.get("start_on")),p_end_on: calendarDate(form.get("end_on")),p_default_rate: k==="commission" ? decimal(form.get("default_rate"),true) : null,p_idempotency_key: id(form.get("key")) }));
 return success(`${versionPath(k,id(r.id))}?salvo=1`); } catch (e) { return failure(e); }
}
export async function setItem(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), k = kind(form.get("kind")), v = id(form.get("version_id"));
 await commercialRpc(s,"set_commercial_item",{ p_kind: k,p_version_id: v,p_expected_revision: integer(form.get("revision")),p_product_id: id(form.get("product_id")),p_value: form.get("remove")==="1" ? null : decimal(form.get("value"),k==="commission"),p_idempotency_key: id(form.get("key")) }); return success(`${versionPath(k,v)}?salvo=1`);
 } catch (e) { return failure(e); }
}
export async function publishVersion(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), k = kind(form.get("kind")), v = id(form.get("version_id"));
 await commercialRpc(s,"publish_commercial_version",{ p_kind: k,p_version_id: v,p_expected_revision: integer(form.get("revision")),p_idempotency_key: id(form.get("key")) }); return success(`${versionPath(k,v)}?publicado=1`);
 } catch (e) { return failure(e); }
}
export async function saveTerm(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), target = optionalId(form.get("id"));
 await commercialRpc(s,"save_payment_term",{ p_id: target,p_expected_revision: target ? integer(form.get("revision")) : null,p_name: formText(form,"name"),p_installments: integer(form.get("installments"),1,12),p_first_due_days: integer(form.get("first_due_days"),0,365),p_interval_days: integer(form.get("interval_days"),0,365),p_active: activeValue(form.get("active")),p_idempotency_key: id(form.get("key")) }); return success("/empresa/condicoes-pagamento?salvo=1");
 } catch (e) { return failure(e); }
}
export async function setCustomerCommercial(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(), customer = id(form.get("customer_id"));
 await commercialRpc(s,"set_customer_commercial",{ p_customer_id: customer,p_expected_revision: integer(form.get("revision")),p_price_list_id: optionalId(form.get("price_list_id")),p_payment_term_id: optionalId(form.get("payment_term_id")),p_idempotency_key: id(form.get("key")) }); return success(`/empresa/clientes/${customer}/condicoes?salvo=1`);
 } catch (e) { return failure(e); }
}
export async function assignCommission(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession();
 await commercialRpc(s,"assign_seller_commission",{ p_seller_membership_id: id(form.get("seller_id")),p_table_id: id(form.get("table_id")),p_start_on: calendarDate(form.get("start_on")),p_end_on: calendarDate(form.get("end_on")),p_idempotency_key: id(form.get("key")) }); return success("/empresa/comissoes/atribuicoes?salvo=1");
 } catch (e) { return failure(e); }
}
export async function endAssignment(_state: FormState,form: FormData): Promise<FormState> {
 try { const s = await adminSession(); await commercialRpc(s,"end_seller_commission_assignment",{ p_id: id(form.get("id")),p_expected_revision: integer(form.get("revision")),p_end_on: calendarDate(form.get("end_on")),p_idempotency_key: id(form.get("key")) }); return success("/empresa/comissoes/atribuicoes?encerrado=1");
 } catch (e) { return failure(e); }
}
