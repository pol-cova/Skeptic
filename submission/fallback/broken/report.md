# Skeptic Run Report

> This report may contain screenshots, URLs, and UI text from the application under test. Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.

- **Run ID:** `verify-1785118802588`
- **Readiness:** NOT_READY
- **Exit code:** 1
- **Started:** 2026-07-27T02:20:02.588Z
- **Finished:** 2026-07-27T02:20:07.264Z
- **Artifact root:** `/Users/paulcontreras/Documents/Skeptic/skeptic/.proof/runs/verify-1785118802588`

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

- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000030-1.png](screenshots/000030-1.png)
- [screenshots/000031-1.png](screenshots/000031-1.png)
- [screenshots/000032-1.png](screenshots/000032-1.png)

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

- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000030-1.png](screenshots/000030-1.png)
- [screenshots/000031-1.png](screenshots/000031-1.png)
- [screenshots/000032-1.png](screenshots/000032-1.png)
- [screenshots/000068-2.png](screenshots/000068-2.png)
- [screenshots/000069-2.png](screenshots/000069-2.png)
- [screenshots/000070-2.png](screenshots/000070-2.png)
- [screenshots/000071-2.png](screenshots/000071-2.png)

## Timeline

- `0` 2026-07-27T02:20:02.692Z · **system** · `run.started`
- `1` 2026-07-27T02:20:03.006Z · **harness** · `network.observed`
- `2` 2026-07-27T02:20:03.013Z · **harness** · `network.observed`
- `3` 2026-07-27T02:20:03.022Z · **harness** · `network.observed`
- `4` 2026-07-27T02:20:03.023Z · **harness** · `network.observed`
- `5` 2026-07-27T02:20:03.023Z · **harness** · `network.observed`
- `6` 2026-07-27T02:20:03.140Z · **harness** · `network.observed`
- `7` 2026-07-27T02:20:03.705Z · **harness** · `network.observed`
- `8` 2026-07-27T02:20:03.775Z · **harness** · `network.observed`
- `9` 2026-07-27T02:20:03.776Z · **harness** · `network.observed`
- `10` 2026-07-27T02:20:03.853Z · **harness** · `network.observed`
- `11` 2026-07-27T02:20:03.933Z · **harness** · `network.observed`
- `12` 2026-07-27T02:20:03.939Z · **harness** · `network.observed`
- `13` 2026-07-27T02:20:03.945Z · **harness** · `network.observed`
- `14` 2026-07-27T02:20:03.953Z · **harness** · `network.observed`
- `15` 2026-07-27T02:20:03.961Z · **harness** · `network.observed`
- `16` 2026-07-27T02:20:04.035Z · **harness** · `network.observed`
- `17` 2026-07-27T02:20:04.059Z · **harness** · `network.observed`
- `18` 2026-07-27T02:20:04.060Z · **harness** · `network.observed`
- `19` 2026-07-27T02:20:04.061Z · **harness** · `network.observed`
- `20` 2026-07-27T02:20:04.650Z · **harness** · `network.observed`
- `21` 2026-07-27T02:20:04.978Z · **harness** · `page.observed` · criterion 1
- `22` 2026-07-27T02:20:04.978Z · **harness** · `page.observed` · criterion 1
- `23` 2026-07-27T02:20:04.978Z · **harness** · `page.observed` · criterion 1
- `24` 2026-07-27T02:20:04.978Z · **harness** · `page.observed` · criterion 1
- `25` 2026-07-27T02:20:04.978Z · **harness** · `page.observed` · criterion 1
- `26` 2026-07-27T02:20:04.979Z · **harness** · `page.observed` · criterion 1
- `27` 2026-07-27T02:20:04.979Z · **harness** · `page.observed` · criterion 1
- `28` 2026-07-27T02:20:04.979Z · **harness** · `page.observed` · criterion 1
- `29` 2026-07-27T02:20:04.979Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png)
- `30` 2026-07-27T02:20:05.011Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000030-1.png](screenshots/000030-1.png)
- `31` 2026-07-27T02:20:05.046Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000031-1.png](screenshots/000031-1.png)
- `32` 2026-07-27T02:20:05.093Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000032-1.png](screenshots/000032-1.png)
- `33` 2026-07-27T02:20:05.127Z · **oracle** · `criterion.completed` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png)
- `34` 2026-07-27T02:20:05.213Z · **harness** · `network.observed`
- `35` 2026-07-27T02:20:05.221Z · **harness** · `network.observed`
- `36` 2026-07-27T02:20:05.224Z · **harness** · `network.observed`
- `37` 2026-07-27T02:20:05.225Z · **harness** · `network.observed`
- `38` 2026-07-27T02:20:05.227Z · **harness** · `network.observed`
- `39` 2026-07-27T02:20:05.344Z · **harness** · `network.observed`
- `40` 2026-07-27T02:20:05.752Z · **harness** · `network.observed`
- `41` 2026-07-27T02:20:05.772Z · **harness** · `network.observed`
- `42` 2026-07-27T02:20:05.787Z · **harness** · `network.observed`
- `43` 2026-07-27T02:20:05.793Z · **harness** · `network.observed`
- `44` 2026-07-27T02:20:05.802Z · **harness** · `network.observed`
- `45` 2026-07-27T02:20:05.812Z · **harness** · `network.observed`
- `46` 2026-07-27T02:20:05.813Z · **harness** · `network.observed`
- `47` 2026-07-27T02:20:05.976Z · **harness** · `network.observed`
- `48` 2026-07-27T02:20:05.997Z · **harness** · `network.observed`
- `49` 2026-07-27T02:20:06.082Z · **harness** · `network.observed`
- `50` 2026-07-27T02:20:06.089Z · **harness** · `network.observed`
- `51` 2026-07-27T02:20:06.411Z · **harness** · `network.observed`
- `52` 2026-07-27T02:20:06.418Z · **harness** · `network.observed`
- `53` 2026-07-27T02:20:06.422Z · **harness** · `network.observed`
- `54` 2026-07-27T02:20:06.423Z · **harness** · `network.observed`
- `55` 2026-07-27T02:20:06.426Z · **harness** · `network.observed`
- `56` 2026-07-27T02:20:06.539Z · **harness** · `network.observed`
- `57` 2026-07-27T02:20:06.833Z · **harness** · `network.observed`
- `58` 2026-07-27T02:20:07.007Z · **harness** · `page.observed` · criterion 2
- `59` 2026-07-27T02:20:07.007Z · **harness** · `page.observed` · criterion 2
- `60` 2026-07-27T02:20:07.008Z · **harness** · `page.observed` · criterion 2
- `61` 2026-07-27T02:20:07.008Z · **harness** · `page.observed` · criterion 2
- `62` 2026-07-27T02:20:07.008Z · **harness** · `page.observed` · criterion 2
- `63` 2026-07-27T02:20:07.008Z · **harness** · `page.observed` · criterion 2
- `64` 2026-07-27T02:20:07.008Z · **harness** · `page.observed` · criterion 2
- `65` 2026-07-27T02:20:07.009Z · **harness** · `page.observed` · criterion 2
- `66` 2026-07-27T02:20:07.009Z · **harness** · `page.observed` · criterion 2
- `67` 2026-07-27T02:20:07.009Z · **harness** · `page.observed` · criterion 2
- `68` 2026-07-27T02:20:07.009Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000068-2.png](screenshots/000068-2.png)
- `69` 2026-07-27T02:20:07.040Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000069-2.png](screenshots/000069-2.png)
- `70` 2026-07-27T02:20:07.074Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000070-2.png](screenshots/000070-2.png)
- `71` 2026-07-27T02:20:07.107Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000071-2.png](screenshots/000071-2.png)
- `72` 2026-07-27T02:20:07.141Z · **oracle** · `criterion.completed` · criterion 2 · [screenshots/000072-2.png](screenshots/000072-2.png)

## Bundle artifacts

- [events.jsonl](events.jsonl)
- [metadata.json](metadata.json)
- [replay.json](replay.json)
- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)
- [report.html](report.html)