import type { NextRequest } from "next/server";
import { authenticatedClient, validateContext, writeContext } from "@/modules/identity/session";
import { dashboardPath } from "@/modules/identity/contracts";
import { accessError, navigate, smallForm, verifyOrigin } from "@/modules/identity/http";

export async function POST(request: NextRequest) {
  try {
    verifyOrigin(request);
    const client = await authenticatedClient(true);
    const form = await smallForm(request);
    const context = await validateContext(client, form.get("membership_id") ?? "");
    await writeContext(context.membership_id);
    return navigate(dashboardPath(context.role));
  } catch (error) { return accessError(error); }
}
