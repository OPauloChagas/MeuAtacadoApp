import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readIdentityConfig } from "@/lib/supabase/config";
import { AccessFailure } from "./session";

export function privateJson(body: { data?: unknown; error?: { code: string; message: string; fields: Record<string, string> } }, status = 200) {
  return NextResponse.json({ ...body, requestId: randomUUID() }, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export function accessError(error: unknown) {
  const status = error instanceof AccessFailure ? error.status : 503;
  const code = status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "UNAVAILABLE";
  const message = status === 401 ? "Entre para continuar." : status === 403 ? "Acesso não permitido." : "Serviço temporariamente indisponível.";
  return privateJson({ error: { code, message, fields: {} } }, status);
}

export function verifyOrigin(request: NextRequest) {
  if (request.headers.get("origin") !== readIdentityConfig().origin) throw new AccessFailure(403);
}

export async function smallForm(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw new AccessFailure(403);
  const reader = request.body?.getReader();
  if (!reader) throw new AccessFailure(403);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new AccessFailure(403); }
    chunks.push(value);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export function navigate(path: string) {
  return NextResponse.redirect(new URL(path, readIdentityConfig().origin), {
    status: 303, headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
