import "server-only";
import { privateJson } from "@/modules/identity/http";
import { AccessFailure } from "@/modules/identity/session";
import { CustomerProblem, customerMessage } from "./contracts";

export function customerHttpError(error: unknown) {
  const code = error instanceof AccessFailure ? error.status === 401 ? "UNAUTHENTICATED" : error.status === 403 ? "ACCESS_DENIED" : "UNAVAILABLE"
    : error instanceof CustomerProblem ? error.code : "UNAVAILABLE";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "ACCESS_DENIED" ? 403 : code === "VALIDATION_ERROR" ? 422
    : ["STALE_VERSION", "IDEMPOTENCY_CONFLICT", "DOCUMENT_IN_USE"].includes(code) ? 409 : code === "SELLER_UNAVAILABLE" ? 422 : 503;
  return privateJson({ error: { code, message: customerMessage(code), fields: {} } }, status);
}
