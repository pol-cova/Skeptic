# Submission checklist (Definition of Done)

## Video and demo story

- [ ] Video under 3:00 following [demo-script.md](./demo-script.md) timing beats (manual narration + terminal capture)
- [x] Visible C1 PASS → C2 FAIL (persistence) → C3 UNVERIFIABLE (prerequisite block) — verified in [evidence/submission-evidence.json](./evidence/submission-evidence.json)
- [x] Replay segment shows **zero model calls** and three PASS on fixed app — verified in evidence + [fallback/replay-three-pass.json](./fallback/replay-three-pass.json)
- [x] Fallback path documented; prerecorded assets labeled (not presented as live runs) — see [fallback/README.md](./fallback/README.md)
- [ ] Optional B-roll: `pnpm submission:capture-broll` → [assets/demo-broll.webm](./assets/demo-broll.webm) (silent report scroll; edit with narration)

## Required artifacts

| Item                     | Location                                               | Status |
| ------------------------ | ------------------------------------------------------ | ------ |
| Public repository        | https://github.com/pol-cova/Skeptic                    | Done   |
| License (Apache-2.0)     | [LICENSE](../LICENSE)                                  | Done   |
| README                   | [README](../README.md)                                 | Done   |
| Kiro build artifacts     | [.kiro/README.md](../.kiro/README.md)                  | Done   |
| Architecture diagram     | [assets/architecture.svg](./assets/architecture.svg)   | Done   |
| Broken report screenshot | [assets/report-broken.png](./assets/report-broken.png) | Done   |
| Fixed report screenshot  | [assets/report-fixed.png](./assets/report-fixed.png)   | Done   |
| Demo script              | [demo-script.md](./demo-script.md)                     | Done   |
| Submission narrative     | [narrative.md](./narrative.md)                         | Done   |
| Offline fallback bundle  | [fallback/](./fallback/)                               | Done   |

## Fresh-clone and three-run evidence

Recorded in [evidence/submission-evidence.json](./evidence/submission-evidence.json).

Regenerate and validate:

```bash
pnpm submission:generate
pnpm submission:validate
```

## Validation

```bash
pnpm submission:validate
```

Must exit 0 before submission updates merge.
