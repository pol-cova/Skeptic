# @pol-cova/skeptic

Installable CLI for [Skeptic](https://github.com/pol-cova/Skeptic).

```bash
npm install -g @pol-cova/skeptic
npx playwright install chromium
skeptic init --provider chatgpt
```

Deterministic verification (no model calls):

```bash
export PROOF_TEST_USERNAME=demo
export PROOF_TEST_PASSWORD=skeptic-demo
skeptic verify --config proof.config.ts --deterministic
```

Replay a prior run:

```bash
skeptic replay --run <run-id>
```

Credentials stay in environment variables or the provider's local login store. Skeptic never writes API keys to disk.
