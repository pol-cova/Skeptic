# Skeptic — Team Guide

Share this with new contributors alongside [AGENTS.md](../AGENTS.md) and [product-spec.md](./product-spec.md).

## Document map

| Audience | Start here |
| -------- | ---------- |
| New teammate | This guide → product-spec → README |
| AI agent | AGENTS.md → linked issue → ADR |
| Demo reviewer | product-spec §5 → run demo locally |

## Quick start

Node.js 24, pnpm 10.7.

```bash
git clone https://github.com/pol-cova/Skeptic.git && cd Skeptic
pnpm install && pnpm demo:dev
```

Demo: `http://127.0.0.1:3100/login` — `demo` / `skeptic-demo`

## Spec-driven development

**GitHub issues are the specs.** Epic [#1](https://github.com/pol-cova/Skeptic/issues/1) is the master checklist.

Each P0 issue has: Outcome, Scope, Acceptance criteria, Blocked by, Exit gate, Explicitly out of scope.

### Human workflow

1. Pick an open issue whose blockers are closed
2. Read issue + ADRs + product-spec
3. Branch: `issue-N-short-name`
4. One issue per PR
5. Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
6. PR: link issue (`Closes #N`), list checks in Test plan

### Agent workflow

See [AGENTS.md](../AGENTS.md).

## Do not change without ADR

Verdict names, readiness precedence, CLI shapes, MVP scope, model provider contract.

## Progress

**Done:** #2 contract, #3 preflight, #4 monorepo, #5 demo, #6 core schemas

**Next:** #7 lifecycle → #8 harness → #9 evidence → #10 oracle → #11 gate

## PR checklist

- Linked to one P0 issue
- Acceptance criteria in Test plan
- CI checks pass locally
- No secrets or `.proof/` committed

## Links

- [Product spec v1.1](./product-spec.md)
- [AGENTS.md](../AGENTS.md)
- [Contributing](../CONTRIBUTING.md)
- [Epic #1](https://github.com/pol-cova/Skeptic/issues/1)
