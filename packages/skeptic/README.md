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

skeptic verify --config proof.config.ts --deterministic
```

When verification fails, Skeptic writes `.proof/runs/<run-id>/fix-prompt.md` with remediation steps for your coding agent (no auto-repair or git commits).

## Configuration

Run `skeptic init` to scaffold `proof.config.ts`, `scenario.ts`, and `acceptance.md`, or copy the [template](https://github.com/pol-cova/Skeptic/blob/main/docs/proof.config.template.ts). Implement `buildScenario()` with typed browser steps and assertions. Point `criteria.file` at numbered Markdown acceptance criteria.

Deterministic mode replays your scenario with zero model calls — suitable for CI.

## Commands

| Command                         | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `skeptic init`                  | Scaffold proof.config.ts, scenario.ts, acceptance.md |
| `skeptic verify`                | Run verification against `proof.config.ts`           |
| `skeptic replay --run <id>`     | Replay a prior run from artifacts                    |
| `skeptic report --run <id>`     | Regenerate HTML/Markdown report                      |
| `skeptic fix-prompt --run <id>` | Generate fix instructions for a failed run           |

Use `skeptic init --provider chatgpt` to validate agent provider credentials.

Exit codes: `0` READY, `1` NOT_READY, `2` INCOMPLETE, `3` ERROR.

## Documentation

Full docs: [github.com/pol-cova/Skeptic](https://github.com/pol-cova/Skeptic)
