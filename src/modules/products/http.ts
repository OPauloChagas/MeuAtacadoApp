import "server-only";
import { AccessFailure } from "@/modules/identity/session";
import { privateJson } from "@/modules/identity/http";
import { ProductProblem, productMessage } from "./contracts";

export function productHttpError(error: unknown) {
  const code = error instanceof AccessFailure ? error.status === 401 ? "UNAUTHENTICATED" : error.status === 403 ? "ACCESS_DENIED" : "UNAVAILABLE" : error instanceof ProductProblem ? error.code : "UNAVAILABLE";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "ACCESS_DENIED" ? 403 : code === "PHOTO_TOO_LARGE" ? 413
    : ["STALE_VERSION","IDEMPOTENCY_CONFLICT","SKU_IN_USE","PHOTO_IN_PROGRESS"].includes(code) ? 409
    : code === "PHOTO_UNAVAILABLE" ? 404 : ["VALIDATION_ERROR","PHOTO_INVALID"].includes(code) ? 422 : 503;
  return privateJson({ error: { code, message: productMessage(code), fields: {} } },status);
}
