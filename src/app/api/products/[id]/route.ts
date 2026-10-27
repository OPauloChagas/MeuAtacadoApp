import { privateJson } from "@/modules/identity/http";
import { findProduct } from "@/modules/products/service";
import { productHttpError } from "@/modules/products/http";
export async function GET(_request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try { return privateJson({ data: (await findProduct((await params).id)).data }); }
  catch (error) { return productHttpError(error); }
}
