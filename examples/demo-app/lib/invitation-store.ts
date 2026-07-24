import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { persistenceEnabled } from "./demo-config.ts";
import { isValidEmail } from "./email.ts";

export interface Invitation {
  id: string;
  email: string;
  createdAt: string;
}

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "invitations.json");

async function readPersistedInvitations(): Promise<Invitation[]> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as Invitation[];
  } catch {
    return [];
  }
}

async function writePersistedInvitations(
  invitations: Invitation[],
): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(
    dataFile,
    `${JSON.stringify(invitations, null, 2)}\n`,
    "utf8",
  );
}

export async function listInvitations(): Promise<Invitation[]> {
  if (!persistenceEnabled()) {
    return [];
  }
  return readPersistedInvitations();
}

export type CreateInvitationResult =
  | { ok: true; invitation: Invitation }
  | { ok: false; reason: "invalid" | "duplicate" };

export async function createInvitation(
  email: string,
): Promise<CreateInvitationResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, reason: "invalid" };
  }

  const persisted = persistenceEnabled()
    ? await readPersistedInvitations()
    : [];

  if (
    persisted.some(
      (invitation) => invitation.email.toLowerCase() === normalizedEmail,
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }

  const invitation: Invitation = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  };

  if (persistenceEnabled()) {
    await writePersistedInvitations([...persisted, invitation]);
  }

  return { ok: true, invitation };
}

export async function resetInvitations(): Promise<void> {
  await writePersistedInvitations([]);
}
