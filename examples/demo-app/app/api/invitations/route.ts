import { NextResponse } from "next/server";

import {
  createInvitation,
  listInvitations,
} from "../../../lib/invitation-store.ts";
import { isAuthenticated } from "../../../lib/session.ts";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await listInvitations();
  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { email?: string };
  if (!body.email) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const result = await createInvitation(body.email);
  if (!result.ok) {
    if (result.reason === "invalid") {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "An invitation for this email already exists." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    invitation: result.invitation,
    persisted: Boolean(process.env.DEMO_PERSIST_INVITATIONS === "true"),
  });
}
