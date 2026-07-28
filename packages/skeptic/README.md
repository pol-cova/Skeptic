# @pol-cova/skeptic

[![npm version](https://img.shields.io/npm/v/@pol-cova/skeptic.svg)](https://www.npmjs.com/package/@pol-cova/skeptic)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://github.com/pol-cova/Skeptic/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)

CLI for [Skeptic](https://github.com/pol-cova/Skeptic) — config-driven web app verification with Playwright, a deterministic oracle, and optional agent mode.

## Install

```bash
npm install -g @pol-cova/skeptic@0.2.0
npx playwright install chromium
```

## Quick start

```bash
skeptic init

export PROOF_TEST_USERNAME=your-user
export PROOF_TEST_PASSWORD=your-pass

skeptic validate
skeptic verify --deterministic
```

Agent exploration (requires `SKEPTIC_PROVIDER` and provider credentials):

```bash
skeptic verify --no-deterministic
```

## Commands

| Command                       | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `skeptic init`                | Scaffold verification project files          |
| `skeptic validate`            | Preflight config/criteria/scenario alignment |
| `skeptic verify`              | Deterministic or agent verification          |
| `skeptic inspect`             | Discover selectors on a live page            |
| `skeptic replay --latest`     | Replay a prior run from artifacts            |
| `skeptic report --latest`     | Regenerate HTML/Markdown report              |
| `skeptic fix-prompt --latest` | Generate fix instructions for a failed run   |

Exit codes: `0` READY · `1` NOT_READY · `2` INCOMPLETE · `3` ERROR.

## What's new in 0.2.0

- Agent mode wired into `skeptic verify --no-deterministic`
- `skeptic validate` and `skeptic inspect`
- Rich verify JSON, trace links in reports, self-contained replay

Full changelog: [github.com/pol-cova/Skeptic#changelog](https://github.com/pol-cova/Skeptic#changelog)

## Documentation

Full guides: [github.com/pol-cova/Skeptic/tree/main/docs](https://github.com/pol-cova/Skeptic/tree/main/docs)
