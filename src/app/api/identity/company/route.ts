import { companyDetails } from "@/modules/identity/company";
import { accessError, privateJson } from "@/modules/identity/http";

export async function GET() {
  try { return privateJson({ data: (await companyDetails()).company }); }
  catch (error) { return accessError(error); }
}
