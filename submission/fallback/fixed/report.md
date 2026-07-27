# Skeptic Run Report

> This report may contain screenshots, URLs, and UI text from the application under test. Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.

- **Run ID:** `verify-1785117802371`
- **Readiness:** ERROR
- **Exit code:** 3
- **Started:** 2026-07-27T02:03:22.371Z
- **Finished:** 2026-07-27T02:03:29.385Z
- **Artifact root:** `/Users/paulcontreras/Documents/Skeptic/skeptic/.proof/runs/verify-1785117802371`

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

- [screenshots/000026-1.png](screenshots/000026-1.png)
- [screenshots/000027-1.png](screenshots/000027-1.png)
- [screenshots/000028-1.png](screenshots/000028-1.png)
- [screenshots/000029-1.png](screenshots/000029-1.png)

### [2] PASS

> Deterministic assertions prove this criterion.

A valid email address creates an invitation and displays it in the Pending invitations list.

Deterministic assertions prove the criterion (visible passed, response passed, count passed, count passed).

**Assertions**

- Assertion 1: visible (passed) · expected true · observed true
- Assertion 2: response (passed) · expected {"method":"POST","path":"/api/invitations","status":200} · observed {"method":"POST","path":"/api/invitations","status":200}
- Assertion 3: count (passed) · expected 1 · observed 1
- Assertion 4: count (passed) · expected 1 · observed 1

**Artifacts**

- [screenshots/000026-1.png](screenshots/000026-1.png)
- [screenshots/000027-1.png](screenshots/000027-1.png)
- [screenshots/000028-1.png](screenshots/000028-1.png)
- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000064-2.png](screenshots/000064-2.png)
- [screenshots/000065-2.png](screenshots/000065-2.png)
- [screenshots/000066-2.png](screenshots/000066-2.png)
- [screenshots/000067-2.png](screenshots/000067-2.png)

### [3] PASS

> Deterministic assertions prove this criterion.

Inviting the same email twice shows a duplicate-invitation error and does not create a second row.

Deterministic assertions prove the criterion (visible passed, count passed).

**Assertions**

- Assertion 1: visible (passed) · expected true · observed true
- Assertion 2: count (passed) · expected 1 · observed 1

**Artifacts**

- [screenshots/000026-1.png](screenshots/000026-1.png)
- [screenshots/000027-1.png](screenshots/000027-1.png)
- [screenshots/000028-1.png](screenshots/000028-1.png)
- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000064-2.png](screenshots/000064-2.png)
- [screenshots/000065-2.png](screenshots/000065-2.png)
- [screenshots/000066-2.png](screenshots/000066-2.png)
- [screenshots/000067-2.png](screenshots/000067-2.png)
- [screenshots/000093-3.png](screenshots/000093-3.png)
- [screenshots/000094-3.png](screenshots/000094-3.png)

## Timeline

- `0` 2026-07-27T02:03:22.482Z · **system** · `run.started`
- `1` 2026-07-27T02:03:22.835Z · **harness** · `network.observed`
- `2` 2026-07-27T02:03:22.844Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:22.852Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:22.852Z · **harness** · `network.observed`
- `3` 2026-07-27T02:03:22.852Z · **harness** · `network.observed`
- `4` 2026-07-27T02:03:22.982Z · **harness** · `network.observed`
- `5` 2026-07-27T02:03:23.596Z · **harness** · `network.observed`
- `6` 2026-07-27T02:03:23.669Z · **harness** · `network.observed`
- `6` 2026-07-27T02:03:23.670Z · **harness** · `network.observed`
- `7` 2026-07-27T02:03:23.767Z · **harness** · `network.observed`
- `8` 2026-07-27T02:03:23.855Z · **harness** · `network.observed`
- `9` 2026-07-27T02:03:23.862Z · **harness** · `network.observed`
- `10` 2026-07-27T02:03:23.868Z · **harness** · `network.observed`
- `11` 2026-07-27T02:03:23.878Z · **harness** · `network.observed`
- `12` 2026-07-27T02:03:23.887Z · **harness** · `network.observed`
- `13` 2026-07-27T02:03:23.982Z · **harness** · `network.observed`
- `14` 2026-07-27T02:03:24.009Z · **harness** · `network.observed`
- `15` 2026-07-27T02:03:24.011Z · **harness** · `network.observed`
- `16` 2026-07-27T02:03:24.012Z · **harness** · `network.observed`
- `17` 2026-07-27T02:03:24.493Z · **harness** · `network.observed`
- `18` 2026-07-27T02:03:24.921Z · **harness** · `page.observed` · criterion 1
- `19` 2026-07-27T02:03:24.921Z · **harness** · `page.observed` · criterion 1
- `20` 2026-07-27T02:03:24.921Z · **harness** · `page.observed` · criterion 1
- `21` 2026-07-27T02:03:24.921Z · **harness** · `page.observed` · criterion 1
- `22` 2026-07-27T02:03:24.922Z · **harness** · `page.observed` · criterion 1
- `23` 2026-07-27T02:03:24.922Z · **harness** · `page.observed` · criterion 1
- `24` 2026-07-27T02:03:24.922Z · **harness** · `page.observed` · criterion 1
- `25` 2026-07-27T02:03:24.922Z · **harness** · `page.observed` · criterion 1
- `26` 2026-07-27T02:03:24.922Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000026-1.png](screenshots/000026-1.png)
- `27` 2026-07-27T02:03:24.958Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000027-1.png](screenshots/000027-1.png)
- `28` 2026-07-27T02:03:25.008Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000028-1.png](screenshots/000028-1.png)
- `29` 2026-07-27T02:03:25.056Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png)
- `30` 2026-07-27T02:03:25.105Z · **oracle** · `criterion.completed` · criterion 1 · [screenshots/000026-1.png](screenshots/000026-1.png), [screenshots/000027-1.png](screenshots/000027-1.png), [screenshots/000028-1.png](screenshots/000028-1.png), [screenshots/000029-1.png](screenshots/000029-1.png)
- `31` 2026-07-27T02:03:25.238Z · **harness** · `network.observed`
- `32` 2026-07-27T02:03:25.248Z · **harness** · `network.observed`
- `33` 2026-07-27T02:03:25.251Z · **harness** · `network.observed`
- `34` 2026-07-27T02:03:25.253Z · **harness** · `network.observed`
- `35` 2026-07-27T02:03:25.256Z · **harness** · `network.observed`
- `36` 2026-07-27T02:03:25.421Z · **harness** · `network.observed`
- `37` 2026-07-27T02:03:25.929Z · **harness** · `network.observed`
- `38` 2026-07-27T02:03:25.950Z · **harness** · `network.observed`
- `39` 2026-07-27T02:03:25.961Z · **harness** · `network.observed`
- `40` 2026-07-27T02:03:25.972Z · **harness** · `network.observed`
- `41` 2026-07-27T02:03:25.983Z · **harness** · `network.observed`
- `42` 2026-07-27T02:03:25.999Z · **harness** · `network.observed`
- `42` 2026-07-27T02:03:26.000Z · **harness** · `network.observed`
- `43` 2026-07-27T02:03:26.229Z · **harness** · `network.observed`
- `44` 2026-07-27T02:03:26.257Z · **harness** · `network.observed`
- `45` 2026-07-27T02:03:26.359Z · **harness** · `network.observed`
- `46` 2026-07-27T02:03:26.367Z · **harness** · `network.observed`
- `47` 2026-07-27T02:03:26.806Z · **harness** · `network.observed`
- `48` 2026-07-27T02:03:26.814Z · **harness** · `network.observed`
- `49` 2026-07-27T02:03:26.820Z · **harness** · `network.observed`
- `50` 2026-07-27T02:03:26.822Z · **harness** · `network.observed`
- `51` 2026-07-27T02:03:26.825Z · **harness** · `network.observed`
- `52` 2026-07-27T02:03:27.005Z · **harness** · `network.observed`
- `53` 2026-07-27T02:03:27.379Z · **harness** · `network.observed`
- `54` 2026-07-27T02:03:27.619Z · **harness** · `page.observed` · criterion 2
- `55` 2026-07-27T02:03:27.619Z · **harness** · `page.observed` · criterion 2
- `56` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `57` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `58` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `59` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `60` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `61` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `62` 2026-07-27T02:03:27.620Z · **harness** · `page.observed` · criterion 2
- `63` 2026-07-27T02:03:27.621Z · **harness** · `page.observed` · criterion 2
- `64` 2026-07-27T02:03:27.621Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000064-2.png](screenshots/000064-2.png)
- `65` 2026-07-27T02:03:27.652Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000065-2.png](screenshots/000065-2.png)
- `66` 2026-07-27T02:03:27.689Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000066-2.png](screenshots/000066-2.png)
- `67` 2026-07-27T02:03:27.719Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000067-2.png](screenshots/000067-2.png)
- `68` 2026-07-27T02:03:27.752Z · **oracle** · `criterion.completed` · criterion 2 · [screenshots/000026-1.png](screenshots/000026-1.png), [screenshots/000027-1.png](screenshots/000027-1.png), [screenshots/000028-1.png](screenshots/000028-1.png), [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000064-2.png](screenshots/000064-2.png), [screenshots/000065-2.png](screenshots/000065-2.png), [screenshots/000066-2.png](screenshots/000066-2.png), [screenshots/000067-2.png](screenshots/000067-2.png)
- `69` 2026-07-27T02:03:27.783Z · **harness** · `network.observed`
- `70` 2026-07-27T02:03:27.789Z · **harness** · `network.observed`
- `71` 2026-07-27T02:03:27.793Z · **harness** · `network.observed`
- `72` 2026-07-27T02:03:27.795Z · **harness** · `network.observed`
- `73` 2026-07-27T02:03:27.797Z · **harness** · `network.observed`
- `74` 2026-07-27T02:03:27.939Z · **harness** · `network.observed`
- `75` 2026-07-27T02:03:28.462Z · **harness** · `network.observed`
- `76` 2026-07-27T02:03:28.480Z · **harness** · `network.observed`
- `77` 2026-07-27T02:03:28.488Z · **harness** · `network.observed`
- `78` 2026-07-27T02:03:28.498Z · **harness** · `network.observed`
- `79` 2026-07-27T02:03:28.507Z · **harness** · `network.observed`
- `80` 2026-07-27T02:03:28.522Z · **harness** · `network.observed`
- `81` 2026-07-27T02:03:28.523Z · **harness** · `network.observed`
- `82` 2026-07-27T02:03:28.741Z · **harness** · `network.observed`
- `83` 2026-07-27T02:03:28.751Z · **harness** · `network.observed`
- `84` 2026-07-27T02:03:28.909Z · **harness** · `network.observed`
- `85` 2026-07-27T02:03:29.169Z · **harness** · `page.observed` · criterion 3
- `86` 2026-07-27T02:03:29.169Z · **harness** · `page.observed` · criterion 3
- `87` 2026-07-27T02:03:29.169Z · **harness** · `page.observed` · criterion 3
- `88` 2026-07-27T02:03:29.169Z · **harness** · `page.observed` · criterion 3
- `89` 2026-07-27T02:03:29.169Z · **harness** · `page.observed` · criterion 3
- `90` 2026-07-27T02:03:29.170Z · **harness** · `page.observed` · criterion 3
- `91` 2026-07-27T02:03:29.170Z · **harness** · `page.observed` · criterion 3
- `92` 2026-07-27T02:03:29.170Z · **harness** · `page.observed` · criterion 3
- `93` 2026-07-27T02:03:29.170Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000093-3.png](screenshots/000093-3.png)
- `94` 2026-07-27T02:03:29.203Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000094-3.png](screenshots/000094-3.png)
- `95` 2026-07-27T02:03:29.238Z · **oracle** · `criterion.completed` · criterion 3 · [screenshots/000026-1.png](screenshots/000026-1.png), [screenshots/000027-1.png](screenshots/000027-1.png), [screenshots/000028-1.png](screenshots/000028-1.png), [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000064-2.png](screenshots/000064-2.png), [screenshots/000065-2.png](screenshots/000065-2.png), [screenshots/000066-2.png](screenshots/000066-2.png), [screenshots/000067-2.png](screenshots/000067-2.png), [screenshots/000093-3.png](screenshots/000093-3.png), [screenshots/000094-3.png](screenshots/000094-3.png)

## Bundle artifacts

- [events.jsonl](events.jsonl)
- [metadata.json](metadata.json)
- [replay.json](replay.json)
- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)
- [report.html](report.html)