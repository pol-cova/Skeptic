# Evidence reports — requirements

**Issue:** [#16](https://github.com/pol-cova/Skeptic/issues/16)  
**Package:** `@skeptic/report`  
**Output:** `.proof/runs/<run-id>/report.html`, `report.md`

## Outcome

Judges can inspect the full broken/fixed evidence story from generated artifacts without a server or proprietary viewer.

## Acceptance criteria

- [x] `report.html` opens directly from disk (relative links only)
- [x] Every `PASS`/`FAIL` links to assertion results and artifact refs when present
- [x] `UNVERIFIABLE`/`HARNESS_ERROR` include guidance that they are not product failures
- [x] Markdown is paste-ready for PR comments (no GitHub credentials required)
- [x] HTML includes skip link, focus styles, text badges, and escaped dynamic content
- [x] Reports generate automatically in `EvidenceStore.finalize()`

## Report sections

1. Privacy / authorized-use notice
2. Run summary (readiness, exit code, timestamps)
3. Reference demo broken vs fixed comparison
4. Per-criterion: text, verdict guidance, assertions, artifact links
5. Ordered event timeline
6. Bundle artifact index

## Wiring

- `packages/evidence/src/evidence-store.ts` — calls `writeRunReports()` after metadata write
- `packages/cli/src/report-command.ts` — regenerates reports from an existing bundle
- `packages/cli/src/verify-runner.ts` — finalize via evidence store (reports included)

## Tests

- `packages/report/src/render.test.ts` — escaping, accessibility markers, assertion links
