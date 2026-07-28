# @pol-cova/skeptic

[![npm version](https://img.shields.io/npm/v/@pol-cova/skeptic.svg)](https://www.npmjs.com/package/@pol-cova/skeptic)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://github.com/pol-cova/Skeptic/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

CLI for [Skeptic](https://github.com/pol-cova/Skeptic) — config-driven web app verification with Playwright and optional AI agent.

## Install

```bash
npm install -g @pol-cova/skeptic
npx playwright install chromium
```

## Quick start

```bash
skeptic init

export PROOF_TEST_USERNAME=your-user
export PROOF_TEST_PASSWORD=your-pass

# Edit proof.config.ts, acceptance.md, and scenario.ts for your app
skeptic verify --config proof.config.ts --deterministic
```

When verification fails, Skeptic writes `.proof/runs/<run-id>/fix-prompt.md` with remediation steps for your coding agent. Skeptic does not auto-repair code or create commits.

## Commands

| Command | Description |
| --- | --- |
| `skeptic init` | Scaffold `proof.config.ts`, `scenario.ts`, `acceptance.md` |
| `skeptic verify` | Run verification against your config |
| `skeptic replay --run <id>` | Replay a prior run from artifacts |
| `skeptic report --run <id>` | Regenerate HTML/Markdown report |
| `skeptic fix-prompt --run <id>` | Generate fix instructions for a failed run |

Exit codes: `0` READY · `1` NOT_READY · `2` INCOMPLETE · `3` ERROR.

Use `skeptic init --provider chatgpt` to validate agent provider credentials for optional agent mode.

## Documentation

Full guides: [github.com/pol-cova/Skeptic/tree/main/docs](https://github.com/pol-cova/Skeptic/tree/main/docs)

- [Getting started](https://github.com/pol-cova/Skeptic/blob/main/docs/getting-started.md)
- [Configuration](https://github.com/pol-cova/Skeptic/blob/main/docs/configuration.md)
- [Scenarios](https://github.com/pol-cova/Skeptic/blob/main/docs/scenarios.md)
- [CLI reference](https://github.com/pol-cova/Skeptic/blob/main/docs/cli.md)
- [CI and workflows](https://github.com/pol-cova/Skeptic/blob/main/docs/ci-and-workflows.md)
