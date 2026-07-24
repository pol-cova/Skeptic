import { persistenceEnabled } from "../../lib/demo-config.ts";

export function GET() {
  return Response.json({
    status: "ok",
    persistenceEnabled: persistenceEnabled(),
  });
}
