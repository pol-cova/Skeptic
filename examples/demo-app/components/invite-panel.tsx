"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface Invitation {
  id: string;
  email: string;
  createdAt: string;
}

export function InvitePanel() {
  const [email, setEmail] = useState("");
  const [serverInvitations, setServerInvitations] = useState<Invitation[]>([]);
  const [optimisticInvitations, setOptimisticInvitations] = useState<
    Invitation[]
  >([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadInvitations() {
    const response = await fetch("/api/invitations");
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { invitations: Invitation[] };
    setServerInvitations(payload.invitations);
  }

  useEffect(() => {
    void loadInvitations();
  }, []);

  const displayedInvitations = useMemo(() => {
    const merged = [...serverInvitations];
    for (const invitation of optimisticInvitations) {
      if (
        !merged.some(
          (existing) =>
            existing.email.toLowerCase() === invitation.email.toLowerCase(),
        )
      ) {
        merged.push(invitation);
      }
    }
    return merged;
  }, [optimisticInvitations, serverInvitations]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setDuplicateError(null);
    setSuccessMessage(null);

    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as {
      error?: string;
      invitation?: Invitation;
    };

    if (response.status === 400) {
      setValidationError(payload.error ?? "Enter a valid email address.");
      return;
    }

    if (response.status === 409) {
      setDuplicateError(
        payload.error ?? "An invitation for this email already exists.",
      );
      return;
    }

    if (!response.ok || !payload.invitation) {
      setValidationError("Unable to create invitation.");
      return;
    }

    setSuccessMessage(`Invitation sent to ${payload.invitation.email}.`);
    setOptimisticInvitations((current) => [...current, payload.invitation!]);
    setEmail("");
    await loadInvitations();
  }

  return (
    <section className="stack">
      <header className="card">
        <h1>Invite teammate</h1>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="invite-email">Email address</label>
        <input
          id="invite-email"
          data-testid="invite-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {validationError ? (
          <p role="alert" data-testid="invite-validation-error">
            {validationError}
          </p>
        ) : null}
        {duplicateError ? (
          <p role="alert" data-testid="invite-duplicate-error">
            {duplicateError}
          </p>
        ) : null}
        {successMessage ? (
          <p role="status" data-testid="invite-success-toast">
            {successMessage}
          </p>
        ) : null}
        <button type="submit" data-testid="invite-submit">
          Send invitation
        </button>
      </form>

      <section className="card" aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending invitations</h2>
        <ul data-testid="pending-invitations">
          {displayedInvitations.length === 0 ? (
            <li>No pending invitations yet.</li>
          ) : (
            displayedInvitations.map((invitation) => (
              <li
                key={invitation.id}
                data-testid="pending-invitation-row"
                data-email={invitation.email}
              >
                {invitation.email}
              </li>
            ))
          )}
        </ul>
      </section>
    </section>
  );
}
