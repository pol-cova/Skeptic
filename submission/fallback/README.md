# Offline fallback demo

**These are prerecorded verification artifacts.** Opening `report.html` displays a static snapshot from a prior run. Say so explicitly to judges.

| Path | Description |
| ---- | ----------- |
| [broken/](./broken/) | Broken demo — C1 PASS, C2 FAIL, C3 UNVERIFIABLE |
| [fixed/](./fixed/) | Fixed demo — three PASS, READY |
| [replay-three-pass.json](./replay-three-pass.json) | Replay summary — `modelCalls: 0`, three PASS |
| [manifest.json](./manifest.json) | Generation metadata and run IDs |

## Quick offline walkthrough

```bash
open submission/fallback/broken/report.html
open submission/fallback/fixed/report.html
cat submission/fallback/replay-three-pass.json
```

## Live replay (zero model calls)

```bash
pnpm --filter demo-app dev:fixed
pnpm skeptic replay --run <sourceRunId-from-manifest.json>
```

## Regenerate

```bash
pnpm submission:generate
```
