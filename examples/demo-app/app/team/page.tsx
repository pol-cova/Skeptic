import { redirect } from "next/navigation";

import { InvitePanel } from "../../components/invite-panel.tsx";
import { LogoutButton } from "../../components/logout-button.tsx";
import { persistenceEnabled } from "../../lib/demo-config.ts";
import { isAuthenticated } from "../../lib/session.ts";

export default async function TeamPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="stack">
      <div className="toolbar card">
        <p data-testid="demo-mode">
          Mode: {persistenceEnabled() ? "fixed" : "seeded-bug"}
        </p>
        <LogoutButton />
      </div>
      <InvitePanel />
    </div>
  );
}
