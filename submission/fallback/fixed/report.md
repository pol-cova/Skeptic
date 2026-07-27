# Skeptic Run Report

> This report may contain screenshots, URLs, and UI text from the application under test. Review artifacts before sharing. Run Skeptic only on systems you are authorized to test.

- **Run ID:** `verify-1785118809874`
- **Readiness:** READY
- **Exit code:** 0
- **Started:** 2026-07-27T02:20:09.874Z
- **Finished:** 2026-07-27T02:20:15.796Z
- **Artifact root:** `/Users/paulcontreras/Documents/Skeptic/skeptic/.proof/runs/verify-1785118809874`

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

- `0` 2026-07-27T02:20:09.988Z · **system** · `run.started`
- `1` 2026-07-27T02:20:10.297Z · **harness** · `network.observed`
- `2` 2026-07-27T02:20:10.305Z · **harness** · `network.observed`
- `3` 2026-07-27T02:20:10.314Z · **harness** · `network.observed`
- `4` 2026-07-27T02:20:10.314Z · **harness** · `network.observed`
- `5` 2026-07-27T02:20:10.314Z · **harness** · `network.observed`
- `6` 2026-07-27T02:20:10.429Z · **harness** · `network.observed`
- `7` 2026-07-27T02:20:10.954Z · **harness** · `network.observed`
- `8` 2026-07-27T02:20:11.022Z · **harness** · `network.observed`
- `9` 2026-07-27T02:20:11.023Z · **harness** · `network.observed`
- `10` 2026-07-27T02:20:11.097Z · **harness** · `network.observed`
- `11` 2026-07-27T02:20:11.176Z · **harness** · `network.observed`
- `12` 2026-07-27T02:20:11.181Z · **harness** · `network.observed`
- `13` 2026-07-27T02:20:11.188Z · **harness** · `network.observed`
- `14` 2026-07-27T02:20:11.195Z · **harness** · `network.observed`
- `15` 2026-07-27T02:20:11.202Z · **harness** · `network.observed`
- `16` 2026-07-27T02:20:11.275Z · **harness** · `network.observed`
- `17` 2026-07-27T02:20:11.301Z · **harness** · `network.observed`
- `18` 2026-07-27T02:20:11.302Z · **harness** · `network.observed`
- `19` 2026-07-27T02:20:11.303Z · **harness** · `network.observed`
- `20` 2026-07-27T02:20:11.882Z · **harness** · `network.observed`
- `21` 2026-07-27T02:20:12.225Z · **harness** · `page.observed` · criterion 1
- `22` 2026-07-27T02:20:12.225Z · **harness** · `page.observed` · criterion 1
- `23` 2026-07-27T02:20:12.225Z · **harness** · `page.observed` · criterion 1
- `24` 2026-07-27T02:20:12.226Z · **harness** · `page.observed` · criterion 1
- `25` 2026-07-27T02:20:12.226Z · **harness** · `page.observed` · criterion 1
- `26` 2026-07-27T02:20:12.226Z · **harness** · `page.observed` · criterion 1
- `27` 2026-07-27T02:20:12.226Z · **harness** · `page.observed` · criterion 1
- `28` 2026-07-27T02:20:12.226Z · **harness** · `page.observed` · criterion 1
- `29` 2026-07-27T02:20:12.226Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png)
- `30` 2026-07-27T02:20:12.258Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000030-1.png](screenshots/000030-1.png)
- `31` 2026-07-27T02:20:12.294Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000031-1.png](screenshots/000031-1.png)
- `32` 2026-07-27T02:20:12.327Z · **oracle** · `assertion.checked` · criterion 1 · [screenshots/000032-1.png](screenshots/000032-1.png)
- `33` 2026-07-27T02:20:12.360Z · **oracle** · `criterion.completed` · criterion 1 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png)
- `34` 2026-07-27T02:20:12.451Z · **harness** · `network.observed`
- `35` 2026-07-27T02:20:12.459Z · **harness** · `network.observed`
- `36` 2026-07-27T02:20:12.460Z · **harness** · `network.observed`
- `37` 2026-07-27T02:20:12.462Z · **harness** · `network.observed`
- `38` 2026-07-27T02:20:12.465Z · **harness** · `network.observed`
- `39` 2026-07-27T02:20:12.603Z · **harness** · `network.observed`
- `40` 2026-07-27T02:20:13.019Z · **harness** · `network.observed`
- `41` 2026-07-27T02:20:13.035Z · **harness** · `network.observed`
- `42` 2026-07-27T02:20:13.042Z · **harness** · `network.observed`
- `43` 2026-07-27T02:20:13.049Z · **harness** · `network.observed`
- `44` 2026-07-27T02:20:13.057Z · **harness** · `network.observed`
- `45` 2026-07-27T02:20:13.069Z · **harness** · `network.observed`
- `46` 2026-07-27T02:20:13.070Z · **harness** · `network.observed`
- `47` 2026-07-27T02:20:13.235Z · **harness** · `network.observed`
- `48` 2026-07-27T02:20:13.257Z · **harness** · `network.observed`
- `49` 2026-07-27T02:20:13.348Z · **harness** · `network.observed`
- `50` 2026-07-27T02:20:13.354Z · **harness** · `network.observed`
- `51` 2026-07-27T02:20:13.679Z · **harness** · `network.observed`
- `52` 2026-07-27T02:20:13.685Z · **harness** · `network.observed`
- `53` 2026-07-27T02:20:13.689Z · **harness** · `network.observed`
- `54` 2026-07-27T02:20:13.690Z · **harness** · `network.observed`
- `55` 2026-07-27T02:20:13.693Z · **harness** · `network.observed`
- `56` 2026-07-27T02:20:13.807Z · **harness** · `network.observed`
- `57` 2026-07-27T02:20:14.120Z · **harness** · `network.observed`
- `58` 2026-07-27T02:20:14.307Z · **harness** · `page.observed` · criterion 2
- `59` 2026-07-27T02:20:14.307Z · **harness** · `page.observed` · criterion 2
- `60` 2026-07-27T02:20:14.307Z · **harness** · `page.observed` · criterion 2
- `61` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `62` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `63` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `64` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `65` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `66` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `67` 2026-07-27T02:20:14.308Z · **harness** · `page.observed` · criterion 2
- `68` 2026-07-27T02:20:14.308Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000068-2.png](screenshots/000068-2.png)
- `69` 2026-07-27T02:20:14.340Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000069-2.png](screenshots/000069-2.png)
- `70` 2026-07-27T02:20:14.374Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000070-2.png](screenshots/000070-2.png)
- `71` 2026-07-27T02:20:14.407Z · **oracle** · `assertion.checked` · criterion 2 · [screenshots/000071-2.png](screenshots/000071-2.png)
- `72` 2026-07-27T02:20:14.441Z · **oracle** · `criterion.completed` · criterion 2 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png), [screenshots/000068-2.png](screenshots/000068-2.png), [screenshots/000069-2.png](screenshots/000069-2.png), [screenshots/000070-2.png](screenshots/000070-2.png), [screenshots/000071-2.png](screenshots/000071-2.png)
- `73` 2026-07-27T02:20:14.463Z · **harness** · `network.observed`
- `74` 2026-07-27T02:20:14.470Z · **harness** · `network.observed`
- `75` 2026-07-27T02:20:14.473Z · **harness** · `network.observed`
- `76` 2026-07-27T02:20:14.475Z · **harness** · `network.observed`
- `77` 2026-07-27T02:20:14.477Z · **harness** · `network.observed`
- `78` 2026-07-27T02:20:14.590Z · **harness** · `network.observed`
- `79` 2026-07-27T02:20:15.019Z · **harness** · `network.observed`
- `80` 2026-07-27T02:20:15.029Z · **harness** · `network.observed`
- `81` 2026-07-27T02:20:15.037Z · **harness** · `network.observed`
- `82` 2026-07-27T02:20:15.045Z · **harness** · `network.observed`
- `83` 2026-07-27T02:20:15.053Z · **harness** · `network.observed`
- `84` 2026-07-27T02:20:15.063Z · **harness** · `network.observed`
- `85` 2026-07-27T02:20:15.064Z · **harness** · `network.observed`
- `86` 2026-07-27T02:20:15.266Z · **harness** · `network.observed`
- `87` 2026-07-27T02:20:15.273Z · **harness** · `network.observed`
- `88` 2026-07-27T02:20:15.416Z · **harness** · `network.observed`
- `89` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `90` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `91` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `92` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `93` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `94` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `95` 2026-07-27T02:20:15.625Z · **harness** · `page.observed` · criterion 3
- `96` 2026-07-27T02:20:15.626Z · **harness** · `page.observed` · criterion 3
- `97` 2026-07-27T02:20:15.626Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000097-3.png](screenshots/000097-3.png)
- `98` 2026-07-27T02:20:15.658Z · **oracle** · `assertion.checked` · criterion 3 · [screenshots/000098-3.png](screenshots/000098-3.png)
- `99` 2026-07-27T02:20:15.694Z · **oracle** · `criterion.completed` · criterion 3 · [screenshots/000029-1.png](screenshots/000029-1.png), [screenshots/000030-1.png](screenshots/000030-1.png), [screenshots/000031-1.png](screenshots/000031-1.png), [screenshots/000032-1.png](screenshots/000032-1.png), [screenshots/000068-2.png](screenshots/000068-2.png), [screenshots/000069-2.png](screenshots/000069-2.png), [screenshots/000070-2.png](screenshots/000070-2.png), [screenshots/000071-2.png](screenshots/000071-2.png), [screenshots/000097-3.png](screenshots/000097-3.png), [screenshots/000098-3.png](screenshots/000098-3.png)

## Bundle artifacts

- [events.jsonl](events.jsonl)
- [metadata.json](metadata.json)
- [replay.json](replay.json)
- [generated/acceptance.spec.ts](generated/acceptance.spec.ts)
- [report.html](report.html)