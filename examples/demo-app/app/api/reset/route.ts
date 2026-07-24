import { NextResponse } from "next/server";

import { persistenceEnabled } from "../../../lib/demo-config.ts";
import { resetInvitations } from "../../../lib/invitation-store.ts";

export async function POST() {
  await resetInvitations();
  return NextResponse.json({
    ok: true,
    persistenceEnabled: persistenceEnabled(),
  });
}
