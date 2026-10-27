import type { NextRequest } from "next/server";
import { privateJson, verifyOrigin } from "@/modules/identity/http";
import { selectedContext } from "@/modules/identity/session";
import { readProduct } from "@/modules/products/service";
import { ProductProblem, productId } from "@/modules/products/contracts";
import { normalizePhoto } from "@/modules/products/images";
import { photoForm, changeProductPhoto } from "@/modules/products/photos";
import { productHttpError } from "@/modules/products/http";

export const runtime = "nodejs";
export async function GET(_request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await selectedContext(), product = await readProduct(session,productId((await params).id));
    if (!product.path) throw new ProductProblem("PHOTO_UNAVAILABLE");
    const { data, error } = await session.client.storage.from("product-photos").download(product.path);
    if (error || !data) throw new ProductProblem("PHOTO_UNAVAILABLE");
    const bytes = await normalizePhoto(new Uint8Array(await data.arrayBuffer()),"image/webp").catch(() => { throw new ProductProblem("PHOTO_UNAVAILABLE"); });
    return new Response(new Uint8Array(bytes),{ headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return productHttpError(error); }
}
export async function POST(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  try {
    verifyOrigin(request); const session = await selectedContext();
    if (session.context.role !== "admin") throw new ProductProblem("ACCESS_DENIED");
    const id = productId((await params).id), status = await changeProductPhoto(session,id,await photoForm(request));
    return privateJson({ data: { destination: `/empresa/produtos/${id}?foto=${status}` } });
  } catch (error) { return productHttpError(error); }
}
