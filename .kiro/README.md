# Skeptic — Kiro documentation index

This folder holds specs and steering artifacts for contributors and AI agents. **Nothing under `.kiro/` is imported at runtime.**

## Structure

```text
.kiro/
├── README.md
├── AGENTS.md
├── specs/
│   ├── evidence-reports/     # Issue #16 report deliverables
│   └── google-ai-native-provider/
├── steering/
│   ├── product-spec.md
│   ├── team-guide.md
│   └── preflight.md
└── adr/
    ├── 0001-public-contract.md
    └── 0002-model-provider-strategy.md
```

## Start here

| Audience        | Read first                                      |
| ----------------- | ----------------------------------------------- |
| New contributor   | [steering/team-guide.md](steering/team-guide.md) → [product-spec.md](steering/product-spec.md) → [../README.md](../README.md) |
| AI agent          | [AGENTS.md](AGENTS.md) → assigned GitHub issue → relevant ADR |
| Demo reviewer     | [product-spec.md](steering/product-spec.md) §4 → run `pnpm demo:dev` |

## Build process artifacts

- **Evidence reports (#16):** [specs/evidence-reports/requirements.md](specs/evidence-reports/requirements.md)
- **Google AI provider:** [specs/google-ai-native-provider/requirements.md](specs/google-ai-native-provider/requirements.md)
- **Frozen contracts:** [adr/0001-public-contract.md](adr/0001-public-contract.md), [adr/0002-model-provider-strategy.md](adr/0002-model-provider-strategy.md)

## Quick start

```bash
git clone https://github.com/pol-cova/Skeptic.git && cd Skeptic
pnpm install && pnpm demo:dev
# http://127.0.0.1:3100/login — demo / skeptic-demo
```

Last updated: 2026-07-26
