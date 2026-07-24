import { NextResponse } from "next/server";

import { credentialsAreValid, SESSION_COOKIE } from "../../../lib/session.ts";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (
    !body.username ||
    !body.password ||
    !credentialsAreValid(body.username, body.password)
  ) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
