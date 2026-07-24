import { cookies } from "next/headers";

import { demoCredentials } from "./demo-config.ts";

export const SESSION_COOKIE = "demo-app-session";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === "authenticated";
}

export function credentialsAreValid(
  username: string,
  password: string,
): boolean {
  const expected = demoCredentials();
  return username === expected.username && password === expected.password;
}
