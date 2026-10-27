import "server-only";
import { AccessFailure } from "@/modules/identity/session";
import { privateJson } from "@/modules/identity/http";
import { CommercialProblem,message } from "./contracts";
export function commercialError(error: unknown) {
 const code = error instanceof AccessFailure ? error.status===401 ? "UNAUTHENTICATED" : error.status===403 ? "ACCESS_DENIED" : "UNAVAILABLE" : error instanceof CommercialProblem ? error.code : "UNAVAILABLE";
 const status = code==="UNAUTHENTICATED" ? 401 : code==="ACCESS_DENIED" ? 403 : code==="UNAVAILABLE" ? 503 : ["STALE_VERSION","IDEMPOTENCY_CONFLICT","NAME_IN_USE","PERIOD_OVERLAP","PUBLISHED_IMMUTABLE","INVALID_STATE"].includes(code) ? 409 : 422;
 return privateJson({ error: { code,message: code==="UNAUTHENTICATED" ? "Entre para continuar." : message(code),fields: {} } },status);
}
