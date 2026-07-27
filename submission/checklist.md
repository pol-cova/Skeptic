# Submission checklist (Definition of Done)

## Video and demo story

- [ ] Video under 3:00 following [demo-script.md](./demo-script.md) timing beats
- [ ] Visible C1 PASS → C2 FAIL (persistence) → C3 UNVERIFIABLE (prerequisite block)
- [ ] Replay segment shows **zero model calls** and three PASS on fixed app
- [ ] Fallback path documented; prerecorded assets labeled (not presented as live runs)

## Required artifacts

| Item                     | Location                                               |
| ------------------------ | ------------------------------------------------------ |
| Public repository        | https://github.com/pol-cova/Skeptic                    |
| License (Apache-2.0)     | [LICENSE](../LICENSE)                                  |
| README                   | [README](../README.md)                                 |
| Kiro build artifacts     | [.kiro/README.md](../.kiro/README.md)                  |
| Architecture diagram     | [assets/architecture.svg](./assets/architecture.svg)   |
| Broken report screenshot | [assets/report-broken.png](./assets/report-broken.png) |
| Fixed report screenshot  | [assets/report-fixed.png](./assets/report-fixed.png)   |
| Demo script              | [demo-script.md](./demo-script.md)                     |
| Submission narrative     | [narrative.md](./narrative.md)                         |
| Offline fallback bundle  | [fallback/](./fallback/)                               |

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

Must exit 0 before merging the #21 PR.
