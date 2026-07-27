# Skeptic hackathon submission assets

This directory packages everything required for the three-minute judge demo, offline fallback, and Reto 3 submission checklist.

| Asset | Purpose |
| ----- | ------- |
| [demo-script.md](./demo-script.md) | Exact 3-minute narration with PRD timing beats |
| [narrative.md](./narrative.md) | Innovation, impact, and specialized-agent justification |
| [checklist.md](./checklist.md) | Definition-of-done checklist with evidence links |
| [assets/](./assets/) | Architecture diagram and broken/fixed report screenshots |
| [fallback/](./fallback/) | Prerecorded reports and replay summary for offline judging |
| [evidence/](./evidence/) | Machine-readable fresh-clone and three-run evidence |

## Live demo (preferred)

```bash
pnpm install
pnpm demo:dev
# http://127.0.0.1:3100/login — demo / skeptic-demo

PROOF_TEST_USERNAME=demo PROOF_TEST_PASSWORD=skeptic-demo \
  pnpm skeptic verify --config examples/demo-app/proof.config.ts --deterministic
```

Follow [demo-script.md](./demo-script.md) for the judge-facing flow.

## Offline fallback (no network / no Bedrock)

When live model access or network is unavailable, use the prerecorded bundle under [fallback/](./fallback/). **Do not present static HTML as a live agent run.** Label it explicitly as a prerecorded artifact or replay.

```bash
open submission/fallback/broken/report.html
open submission/fallback/fixed/report.html
cat submission/fallback/replay-three-pass.json
```

## Regenerate assets

```bash
pnpm submission:generate
pnpm submission:validate
```

## Public links

- Repository: https://github.com/pol-cova/Skeptic
- License: [Apache-2.0](../LICENSE)
- Kiro build artifacts: [.kiro/README.md](../.kiro/README.md)
