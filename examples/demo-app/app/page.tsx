import { redirect } from "next/navigation";

import { isAuthenticated } from "../lib/session.ts";

export default async function HomePage() {
  if (await isAuthenticated()) {
    redirect("/team");
  }

  redirect("/login");
}
