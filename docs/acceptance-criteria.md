# Acceptance criteria

Acceptance criteria live in a Markdown file referenced by `criteria.file` in `proof.config.ts` (typically `acceptance.md`).

## Format

Use a numbered ordered list. Each item becomes one criterion Skeptic verifies independently.

```markdown
# Team invitations

1. An invalid email address shows a validation message and does not create an invitation.
2. A valid email address creates an invitation and displays it in the Pending invitations list.
3. Inviting the same email twice shows a duplicate-invitation error and does not create a second row.
```

### Rules

1. **Numbers map to indices** — `1.` → `criterionIndex: 1` in `scenario.ts`.
2. **One outcome per criterion** — split compound requirements into separate numbered items.
3. **Observable language** — describe what a user (or browser) would see, not implementation details.
4. **Stay within limits** — at most `criteria.maxCriteria` items are loaded (hard cap 10).
5. **Match scenario text** — copy each criterion's text into the matching `sourceText` field in `scenario.ts` for traceability in reports.

## Writing good criteria

### Do

- "Submitting invalid credentials shows an error and keeps the user on the login page."
- "After checkout, the order confirmation page displays the order number."
- "Deleting a project removes it from the project list."

### Avoid

- "The API returns 200" without a user-visible outcome (unless you assert network responses in the scenario).
- "Code handles edge cases correctly" — not falsifiable in the browser.
- "Performance is acceptable" — no deterministic threshold.

Network-level checks are supported via `response` assertions in `scenario.ts` when paired with clear criteria text.

## Prerequisites

When criterion B depends on criterion A (e.g. "logged-in user can invite a teammate"), either:

1. **Encode login in B's steps** — self-contained scenarios, or
2. **Use `prerequisites` in config** — skip B if A did not `PASS`:

```typescript
prerequisites: {
  "2": [1], // criterion 2 requires criterion 1 to pass first
},
```

If a prerequisite is `FAIL` or `UNVERIFIABLE`, dependent criteria become `UNVERIFIABLE` — not `FAIL`. That distinction matters: `UNVERIFIABLE` means Skeptic could not establish the precondition, not that the product necessarily broke.

## Verdict mapping

| Outcome in browser | Typical verdict |
| --- | --- |
| All assertions for the criterion pass | `PASS` |
| Any assertion fails | `FAIL` |
| Prerequisite missing or blocked flow | `UNVERIFIABLE` |
| Config, origin, or harness fault | `HARNESS_ERROR` |

Only deterministic assertions from the Playwright harness produce `PASS` or `FAIL`. See [ADR 0001](adr/0001-public-contract.md).

## Related

- [Scenarios](scenarios.md) — implement steps for each index
- [Getting started](getting-started.md) — first end-to-end run
