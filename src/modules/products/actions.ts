"use server";
import { selectedContext, AccessFailure } from "@/modules/identity/session";
import { productRpc } from "./service";
import { productInput, productId, positiveInteger, record, productMessage, ProductProblem, type ProductFormState } from "./contracts";

async function save(form: FormData,editing: boolean): Promise<ProductFormState> {
  try {
    const session = await selectedContext(); if (session.context.role !== "admin") throw new ProductProblem("ACCESS_DENIED");
    const input = productInput(form,editing);
    const args: Record<string,unknown> = { p_sku: input.sku, p_name: input.name, p_description: input.description, p_category: input.category,
      p_sales_unit: input.salesUnit, p_package_content: input.packageContent, p_min_quantity: input.minQuantity, p_quantity_multiple: input.quantityMultiple, p_idempotency_key: input.key };
    if (editing) Object.assign(args,{ p_product_id: productId(form.get("product_id")), p_expected_revision: positiveInteger(form.get("revision")), p_active: input.active });
    const result = record(await productRpc(session,editing ? "update_product" : "create_product",args));
    return { status: "success", message: "", destination: `/empresa/produtos/${productId(result.product_id)}?salvo=1` };
  } catch (error) { return { status: "error", message: productMessage(error instanceof AccessFailure ? "ACCESS_DENIED" : error instanceof ProductProblem ? error.code : "UNAVAILABLE") }; }
}
export async function createProduct(_state: ProductFormState,form: FormData) { return save(form,false); }
export async function editProduct(_state: ProductFormState,form: FormData) { return save(form,true); }
