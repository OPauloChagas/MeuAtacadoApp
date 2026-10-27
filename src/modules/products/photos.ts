import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { PHOTO_LIMIT, ProductProblem, productId, positiveInteger, record, photoPath } from "./contracts";
import { normalizePhoto } from "./images";
import { productRpc, type ProductSession } from "./service";

const bucket = "product-photos";
const checksum = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
export async function photoForm(request: NextRequest): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;")) throw new ProductProblem("VALIDATION_ERROR");
  const max = PHOTO_LIMIT + 64_000;
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > max) throw new ProductProblem("PHOTO_TOO_LARGE");
  const reader = request.body?.getReader(); if (!reader) throw new ProductProblem("VALIDATION_ERROR");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength;
    if (size > max) { await reader.cancel(); throw new ProductProblem("PHOTO_TOO_LARGE"); } chunks.push(next.value); }
  let form: FormData;
  try { form = await new Response(new Uint8Array(Buffer.concat(chunks)),{ headers: { "Content-Type": type } }).formData(); }
  catch { throw new ProductProblem("VALIDATION_ERROR"); }
  const keys = [...form.keys()];
  if (keys.length > 4 || new Set(keys).size !== keys.length || keys.some(key => !["operation","key","revision","photo"].includes(key))) throw new ProductProblem("VALIDATION_ERROR");
  return form;
}

/** Physical cleanup is retryable and never deletes the current photo. */
export async function cleanupPhotos(session: ProductSession,id: string,abandonId: string | null = null): Promise<boolean> {
  try {
    const raw = await productRpc(session,"retire_product_photo",{ p_product_id: id, p_photo_id: abandonId });
    if (!Array.isArray(raw)) throw new ProductProblem("UNAVAILABLE");
    const files = raw.map(value => { const row = record(value); return { id: productId(row.id), path: photoPath(row.object_path,session.context.tenant_id,id) }; });
    if (files.length) {
      const { error } = await session.client.storage.from(bucket).remove(files.map(file => file.path));
      if (error) throw new ProductProblem("STORAGE_UNAVAILABLE");
      await productRpc(session,"finish_product_photo_cleanup",{ p_product_id: id, p_photo_ids: files.map(file => file.id) });
    } return true;
  } catch { return false; }
}

export async function changeProductPhoto(session: ProductSession,id: string,form: FormData): Promise<string> {
  if (session.context.role !== "admin") throw new ProductProblem("ACCESS_DENIED");
  const operation = form.get("operation");
  if (operation === "cleanup") {
    if (!await cleanupPhotos(session,id)) throw new ProductProblem("STORAGE_UNAVAILABLE"); return "limpa";
  }
  const revision = positiveInteger(form.get("revision")), key = productId(form.get("key"));
  if (operation === "remove") {
    await productRpc(session,"set_product_photo",{ p_product_id: id, p_expected_revision: revision, p_photo_id: null, p_idempotency_key: key });
    return await cleanupPhotos(session,id) ? "removida" : "pendente";
  }
  if (operation !== "upload") throw new ProductProblem("VALIDATION_ERROR");
  const file = form.get("photo");
  if (!(file instanceof File)) throw new ProductProblem("PHOTO_INVALID");
  if (file.size > PHOTO_LIMIT) throw new ProductProblem("PHOTO_TOO_LARGE");
  const bytes = await normalizePhoto(new Uint8Array(await file.arrayBuffer()),file.type);
  const hash = checksum(bytes);
  const ticket = record(await productRpc(session,"prepare_product_photo",{ p_product_id: id, p_expected_revision: revision, p_checksum: hash, p_idempotency_key: key }));
  const photo = productId(ticket.photo_id), path = photoPath(ticket.object_path,session.context.tenant_id,id);
  try {
    const { error } = await session.client.storage.from(bucket).upload(path,bytes,{ contentType: "image/webp", upsert: false, cacheControl: "0" });
    if (error) {
      // A timeout/replay may find our immutable object already uploaded.
      const previous = await session.client.storage.from(bucket).download(path);
      if (previous.error || !previous.data || checksum(new Uint8Array(await previous.data.arrayBuffer())) !== hash) throw new ProductProblem("STORAGE_UNAVAILABLE");
    }
    await productRpc(session,"set_product_photo",{ p_product_id: id, p_expected_revision: revision, p_photo_id: photo, p_idempotency_key: key });
  } catch (error) { await cleanupPhotos(session,id,photo); throw error; }
  return await cleanupPhotos(session,id) ? "salva" : "pendente";
}
