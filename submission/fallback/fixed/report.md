# Skeptic Run Report

> This report may contain screenshots, URLs, and UI text from the application under test. Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.

- **Run ID:** `verify-1785125016363`
- **Readiness:** READY
- **Exit code:** 0
- **Started:** 2026-07-27T04:03:36.363Z
- **Finished:** 2026-07-27T04:03:42.357Z
- **Artifact root:** `/Users/paulcontreras/Documents/Skeptic/skeptic/.proof/runs/verify-1785125016363`

## Reference demo (broken vs fixed)

| Phase  | C1   | C2   | C3           | Readiness | Exit |
| ------ | ---- | ---- | ------------ | --------- | ---- |
| Broken | PASS | FAIL | UNVERIFIABLE | NOT_READY | 1    |
| Fixed  | PASS | PASS | PASS         | READY     | 0    |

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

- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000030-1.png](screenshots/000030-1.png)
- [screenshots/000031-1.png](screenshots/000031-1.png)
- [screenshots/000032-1.png](screenshots/000032-1.png)
- [screenshots/000068-2.png](screenshots/000068-2.png)
- [screenshots/000069-2.png](screenshots/000069-2.png)
- [screenshots/000070-2.png](screenshots/000070-2.png)
- [screenshots/000071-2.png](screenshots/000071-2.png)

### [3] PASS

> Deterministic assertions prove this criterion.

Inviting the same email twice shows a duplicate-invitation error and does not create a second row.

Deterministic assertions prove the criterion (visible passed, count passed).

**Assertions**

- Assertion 1: visible (passed) · expected true · observed true
- Assertion 2: count (passed) · expected 1 · observed 1

**Artifacts**

- [screenshots/000029-1.png](screenshots/000029-1.png)
- [screenshots/000030-1.png](screenshots/000030-1.png)
- [screenshots/000031-1.png](screenshots/000031-1.png)
- [screenshots/000032-1.png](screenshots/000032-1.png)
- [screenshots/000068-2.png](screenshots/000068-2.png)
- [screenshots/000069-2.png](screenshots/000069-2.png)
- [screenshots/000070-2.png](screenshots/000070-2.png)
- [screenshots/000071-2.png](screenshots/000071-2.png)
- [screenshots/000097-3.png](screenshots/000097-3.png)
- [screenshots/000098-3.png](screenshots/000098-3.png)

## Timeline

- `0` 2026-07-27T04:03:36.479Z · **system** · `run.started`
- `1` 2026-07-27T04:03:36.799Z · **harness** · `network.observed`
- `2` 2026-07-27T04:03:36.810Z · **harness** · `network.observed`
- `3` 2026-07-27T04:03:36.821Z · **harness** · `network.observed`
- `4` 2026-07-27T04:03:36.822Z · **harness** · `network.observed`
- `5` 2026-07-27T04:03:36.822Z · **harness** · `network.observed`
- `6` 2026-07-27T04:03:36.982Z · **harness** · `network.observed`
- `7` 2026-07-27T04:03:37.567Z · **harness** · `network.observed`
- `8` 2026-07-27T04:03:37.637Z · **harness** · `network.observed`
- `9` 2026-07-27T04:03:37.638Z · **harness** · `network.observed`
- `10` 2026-07-27T04:03:37.726Z · **harness** · `network.observed`
- `11` 2026-07-27T04:03:37.809Z · **harness** · `network.observed`
- `12` 2026-07-27T04:03:37.814Z · **harness** · `network.observed`
- `13` 2026-07-27T04:03:37.820Z · **harness** · `network.observed`
- `14` 2026-07-27T04:03:37.829Z · **harness** · `network.observed`
- `15` 2026-07-27T04:03:37.836Z · **harness** · `network.observed`
- `16` 2026-07-27T04:03:37.912Z · **harness** · `network.observed`
- `17` 2026-07-27T04:03:37.939Z · **harness** · `network.observed`
- `18` 2026-07-27T04:03:37.941Z · **harness** · `network.observed`
- `19` 2026-07-27T04:03:37.942Z · **harness** · `network.observed`
- `20` 2026-07-27T04:03:38.474Z · **harness** · `network.observed`
- `21` 2026-07-27T04:03:38.785Z · **harness** · `page.observed` · criterion 1
- `22` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `23` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `24` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `25` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `26` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `27` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `28` 2026-07-27T04:03:38.786Z · **harness** · `page.observed` · criterion 1
- `29` 2026-07-27T04:03:38.787Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png)
- `30` 2026-07-27T04:03:38.815Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000030-1.png](screenshots/000030-1.png)
- `31` 2026-07-27T04:03:38.852Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000031-1.png](screenshots/000031-1.png)
- `32` 2026-07-27T04:03:38.885Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000032-1.png](screenshots/000032-1.png)
- `33` 2026-07-27T04:03:38.920Z · **oracle** · `criterion.completed` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png)
- `34` 2026-07-27T04:03:39.019Z · **harness** · `network.observed`
- `35` 2026-07-27T04:03:39.028Z · **harness** · `network.observed`
- `36` 2026-07-27T04:03:39.030Z · **harness** · `network.observed`
- `37` 2026-07-27T04:03:39.032Z · **harness** · `network.observed`
- `38` 2026-07-27T04:03:39.035Z · **harness** · `network.observed`
- `39` 2026-07-27T04:03:39.162Z · **harness** · `network.observed`
- `40` 2026-07-27T04:03:39.592Z · **harness** · `network.observed`
- `41` 2026-07-27T04:03:39.606Z · **harness** · `network.observed`
- `42` 2026-07-27T04:03:39.616Z · **harness** · `network.observed`
- `43` 2026-07-27T04:03:39.623Z · **harness** · `network.observed`
- `44` 2026-07-27T04:03:39.632Z · **harness** · `network.observed`
- `45` 2026-07-27T04:03:39.644Z · **harness** · `network.observed`
- `46` 2026-07-27T04:03:39.646Z · **harness** · `network.observed`
- `47` 2026-07-27T04:03:39.814Z · **harness** · `network.observed`
- `48` 2026-07-27T04:03:39.835Z · **harness** · `network.observed`
- `49` 2026-07-27T04:03:39.924Z · **harness** · `network.observed`
- `50` 2026-07-27T04:03:39.931Z · **harness** · `network.observed`
- `51` 2026-07-27T04:03:40.256Z · **harness** · `network.observed`
- `52` 2026-07-27T04:03:40.261Z · **harness** · `network.observed`
- `53` 2026-07-27T04:03:40.266Z · **harness** · `network.observed`
- `54` 2026-07-27T04:03:40.266Z · **harness** · `network.observed`
- `55` 2026-07-27T04:03:40.270Z · **harness** · `network.observed`
- `56` 2026-07-27T04:03:40.386Z · **harness** · `network.observed`
- `57` 2026-07-27T04:03:40.693Z · **harness** · `network.observed`
- `58` 2026-07-27T04:03:40.882Z · **harness** · `page.observed` · criterion 2
- `59` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `60` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `61` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `62` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `63` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `64` 2026-07-27T04:03:40.883Z · **harness** · `page.observed` · criterion 2
- `65` 2026-07-27T04:03:40.884Z · **harness** · `page.observed` · criterion 2
- `66` 2026-07-27T04:03:40.884Z · **harness** · `page.observed` · criterion 2
- `67` 2026-07-27T04:03:40.884Z · **harness** · `page.observed` · criterion 2
- `68` 2026-07-27T04:03:40.884Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000068-2.png](screenshots/000068-2.png)
- `69` 2026-07-27T04:03:40.915Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000069-2.png](screenshots/000069-2.png)
- `70` 2026-07-27T04:03:40.949Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000070-2.png](screenshots/000070-2.png)
- `71` 2026-07-27T04:03:40.982Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000071-2.png](screenshots/000071-2.png)
- `72` 2026-07-27T04:03:41.016Z · **oracle** · `criterion.completed` · criterion 2 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png), [screenshots/000068-2.png](screenshots/000068-2.png), [screenshots/000069-2.png](screenshots/000069-2.png), [screenshots/000070-2.png](screenshots/000070-2.png), [screenshots/000071-2.png](screenshots/000071-2.png)
- `73` 2026-07-27T04:03:41.040Z · **harness** · `network.observed`
- `74` 2026-07-27T04:03:41.046Z · **harness** · `network.observed`
- `75` 2026-07-27T04:03:41.048Z · **harness** · `network.observed`
- `76` 2026-07-27T04:03:41.049Z · **harness** · `network.observed`
- `77` 2026-07-27T04:03:41.052Z · **harness** · `network.observed`
- `78` 2026-07-27T04:03:41.168Z · **harness** · `network.observed`
- `79` 2026-07-27T04:03:41.594Z · **harness** · `network.observed`
- `80` 2026-07-27T04:03:41.604Z · **harness** · `network.observed`
- `81` 2026-07-27T04:03:41.612Z · **harness** · `network.observed`
- `82` 2026-07-27T04:03:41.619Z · **harness** · `network.observed`
- `83` 2026-07-27T04:03:41.628Z · **harness** · `network.observed`
- `84` 2026-07-27T04:03:41.644Z · **harness** · `network.observed`
- `85` 2026-07-27T04:03:41.645Z · **harness** · `network.observed`
- `86` 2026-07-27T04:03:41.840Z · **harness** · `network.observed`
- `87` 2026-07-27T04:03:41.848Z · **harness** · `network.observed`
- `88` 2026-07-27T04:03:41.974Z · **harness** · `network.observed`
- `89` 2026-07-27T04:03:42.185Z · **harness** · `page.observed` · criterion 3
- `90` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `91` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `92` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `93` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `94` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `95` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `96` 2026-07-27T04:03:42.186Z · **harness** · `page.observed` · criterion 3
- `97` 2026-07-27T04:03:42.186Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000097-3.png](screenshots/000097-3.png)
- `98` 2026-07-27T04:03:42.219Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000098-3.png](screenshots/000098-3.png)
- `99` 2026-07-27T04:03:42.253Z · **oracle** · `criterion.completed` · criterion 3 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png), [screenshots/000068-2.png](screenshots/000068-2.png), [screenshots/000069-2.png](screenshots/000069-2.png), [screenshots/000070-2.png](screenshots/000070-2.png), [screenshots/000071-2.png](screenshots/000071-2.png), [screenshots/000097-3.png](screenshots/000097-3.png), [screenshots/000098-3.png](screenshots/000098-3.png)

## Bundle artifacts

- [events.jsonl](events.jsonl)
- [metadata.json](metadata.json)
- [replay.json](replay.json)
- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)
- [report.html](report.html)
