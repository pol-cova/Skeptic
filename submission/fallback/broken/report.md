# Skeptic Run Report

> This report may contain screenshots, URLs, and UI text from the application under test. Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.

- **Run ID:** `verify-1785117794103`
- **Readiness:** ERROR
- **Exit code:** 3
- **Started:** 2026-07-27T02:03:14.103Z
- **Finished:** 2026-07-27T02:03:19.545Z
- **Artifact root:** `/Users/paulcontreras/Documents/Skeptic/skeptic/.proof/runs/verify-1785117794103`

## Reference demo (broken vs fixed)

| Phase | C1 | C2 | C3 | Readiness | Exit |
| --- | --- | --- | --- | --- | --- |
| Broken | PASS | FAIL | UNVERIFIABLE | NOT_READY | 1 |
| Fixed | PASS | PASS | PASS | READY | 0 |

Enable the fixed demo with `pnpm --filter demo-app dev:fixed` or `DEMO_PERSIST_INVITATIONS=true`.

## Criteria

### [1] PASS

> Deterministic assertions prove this criterion.

An invalid email address shows a validation message and does not create an invitation.

Deterministic assertions prove the criterion (visible passed, text passed, count passed, response passed).

**Assertions**

- Assertion 1: visible (passed) · expected true · observed true
- Assertion 2: text (passed) · expected "valid email" · observed "Enter a valid email address."
- Assertion 3: count (passed) · expected 0 · observed 0
- Assertion 4: response (passed) · expected {"method":"POST","path":"/api/invitations","status":400} · observed {"method":"POST","path":"/api/invitations","status":400}

**Artifacts**

- [screenshots/000025-1.png](screenshots/000025-1.png)
- [screenshots/000026-1.png](screenshots/000026-1.png)
- [screenshots/000027-1.png](screenshots/000027-1.png)
- [screenshots/000028-1.png](screenshots/000028-1.png)

### [2] FAIL

> Deterministic assertions disprove this criterion.

A valid email address creates an invitation and displays it in the Pending invitations list.

Observed evidence contradicts the criterion (count failed).

**Assertions**

- Assertion 1: visible (passed) · expected true · observed true
- Assertion 2: response (passed) · expected {"method":"POST","path":"/api/invitations","status":200} · observed {"method":"POST","path":"/api/invitations","status":200}
- Assertion 3: count (passed) · expected 1 · observed 1
- Assertion 4: count (failed) · expected 1 · observed 0

**Artifacts**

- [screenshots/000025-1.png](screenshots/000025-1.png)
- [screenshots/000026-1.png](screenshots/000026-1.png)
- [screenshots/000027-1.png](screenshots/000027-1.png)
- [screenshots/000028-1.png](screenshots/000028-1.png)
- [screenshots/000062-2.png](screenshots/000062-2.png)
- [screenshots/000063-2.png](screenshots/000063-2.png)
- [screenshots/000064-2.png](screenshots/000064-2.png)
- [screenshots/000065-2.png](screenshots/000065-2.png)

## Timeline

- `0` 2026-07-27T02:03:14.583Z · **system** · `run.started`
- `1` 2026-07-27T02:03:14.967Z · **harness** · `network.observed`
- `2` 2026-07-27T02:03:14.981Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:15.000Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:15.000Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:15.000Z · **harness** · `network.observed`
- `4` 2026-07-27T02:03:15.109Z · **harness** · `network.observed`
- `5` 2026-07-27T02:03:15.753Z · **harness** · `network.observed`
- `6` 2026-07-27T02:03:15.821Z · **harness** · `network.observed`
- `6` 2026-07-27T02:03:15.822Z · **harness** · `network.observed`
- `7` 2026-07-27T02:03:15.905Z · **harness** · `network.observed`
- `8` 2026-07-27T02:03:15.990Z · **harness** · `network.observed`
- `9` 2026-07-27T02:03:15.996Z · **harness** · `network.observed`
- `10` 2026-07-27T02:03:16.002Z · **harness** · `network.observed`
- `11` 2026-07-27T02:03:16.012Z · **harness** · `network.observed`
- `12` 2026-07-27T02:03:16.020Z · **harness** · `network.observed`
- `13` 2026-07-27T02:03:16.099Z · **harness** · `network.observed`
- `14` 2026-07-27T02:03:16.122Z · **harness** · `network.observed`
- `15` 2026-07-27T02:03:16.132Z · **harness** · `network.observed`
- `15` 2026-07-27T02:03:16.132Z · **harness** · `network.observed`
- `16` 2026-07-27T02:03:16.677Z · **harness** · `network.observed`
- `17` 2026-07-27T02:03:16.986Z · **harness** · `page.observed` · criterion 1
- `18` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `19` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `20` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `21` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `22` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `23` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `24` 2026-07-27T02:03:16.987Z · **harness** · `page.observed` · criterion 1
- `25` 2026-07-27T02:03:16.988Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000025-1.png](screenshots/000025-1.png)
- `26` 2026-07-27T02:03:17.018Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000026-1.png](screenshots/000026-1.png)
- `27` 2026-07-27T02:03:17.055Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000027-1.png](screenshots/000027-1.png)
- `28` 2026-07-27T02:03:17.089Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000028-1.png](screenshots/000028-1.png)
- `29` 2026-07-27T02:03:17.135Z · **oracle** · `criterion.completed` · criterion 1 · [screenshots/000025-1.png](screenshots/000025-1.png), [screenshots/000026-1.png](screenshots/000026-1.png), [screenshots/000027-1.png](screenshots/000027-1.png), [screenshots/000028-1.png](screenshots/000028-1.png)
- `30` 2026-07-27T02:03:17.224Z · **harness** · `network.observed`
- `31` 2026-07-27T02:03:17.232Z · **harness** · `network.observed`
- `32` 2026-07-27T02:03:17.234Z · **harness** · `network.observed`
- `33` 2026-07-27T02:03:17.236Z · **harness** · `network.observed`
- `34` 2026-07-27T02:03:17.238Z · **harness** · `network.observed`
- `35` 2026-07-27T02:03:17.373Z · **harness** · `network.observed`
- `36` 2026-07-27T02:03:17.795Z · **harness** · `network.observed`
- `37` 2026-07-27T02:03:17.810Z · **harness** · `network.observed`
- `38` 2026-07-27T02:03:17.818Z · **harness** · `network.observed`
- `39` 2026-07-27T02:03:17.830Z · **harness** · `network.observed`
- `40` 2026-07-27T02:03:17.838Z · **harness** · `network.observed`
- `41` 2026-07-27T02:03:17.849Z · **harness** · `network.observed`
- `42` 2026-07-27T02:03:17.853Z · **harness** · `network.observed`
- `43` 2026-07-27T02:03:18.016Z · **harness** · `network.observed`
- `44` 2026-07-27T02:03:18.040Z · **harness** · `network.observed`
- `45` 2026-07-27T02:03:18.142Z · **harness** · `network.observed`
- `46` 2026-07-27T02:03:18.150Z · **harness** · `network.observed`
- `47` 2026-07-27T02:03:18.507Z · **harness** · `network.observed`
- `48` 2026-07-27T02:03:18.513Z · **harness** · `network.observed`
- `49` 2026-07-27T02:03:18.518Z · **harness** · `network.observed`
- `49` 2026-07-27T02:03:18.518Z · **harness** · `network.observed`
- `49` 2026-07-27T02:03:18.521Z · **harness** · `network.observed`
- `50` 2026-07-27T02:03:18.637Z · **harness** · `network.observed`
- `51` 2026-07-27T02:03:18.989Z · **harness** · `network.observed`
- `52` 2026-07-27T02:03:19.285Z · **harness** · `page.observed` · criterion 2
- `53` 2026-07-27T02:03:19.285Z · **harness** · `page.observed` · criterion 2
- `54` 2026-07-27T02:03:19.285Z · **harness** · `page.observed` · criterion 2
- `55` 2026-07-27T02:03:19.285Z · **harness** · `page.observed` · criterion 2
- `56` 2026-07-27T02:03:19.285Z · **harness** · `page.observed` · criterion 2
- `57` 2026-07-27T02:03:19.286Z · **harness** · `page.observed` · criterion 2
- `58` 2026-07-27T02:03:19.286Z · **harness** · `page.observed` · criterion 2
- `59` 2026-07-27T02:03:19.286Z · **harness** · `page.observed` · criterion 2
- `60` 2026-07-27T02:03:19.286Z · **harness** · `page.observed` · criterion 2
- `61` 2026-07-27T02:03:19.286Z · **harness** · `page.observed` · criterion 2
- `62` 2026-07-27T02:03:19.286Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000062-2.png](screenshots/000062-2.png)
- `63` 2026-07-27T02:03:19.317Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000063-2.png](screenshots/000063-2.png)
- `64` 2026-07-27T02:03:19.352Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000064-2.png](screenshots/000064-2.png)
- `65` 2026-07-27T02:03:19.385Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000065-2.png](screenshots/000065-2.png)
- `66` 2026-07-27T02:03:19.419Z · **oracle** · `criterion.completed` · criterion 2 · [screenshots/000066-2.png](screenshots/000066-2.png)

## Bundle artifacts

- [events.jsonl](events.jsonl)
- [metadata.json](metadata.json)
- [replay.json](replay.json)
- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)
- [report.html](report.html)