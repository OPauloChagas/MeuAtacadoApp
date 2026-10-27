import { selectedContext } from "@/modules/identity/session";
import { accessError, privateJson } from "@/modules/identity/http";

export async function GET() {
  try { return privateJson({ data: (await selectedContext()).context }); }
  catch (error) { return accessError(error); }
}
