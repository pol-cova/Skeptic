# 📚 Skeptic - Kiro Documentation Index

Esta carpeta contiene toda la documentación y guías para contribuidores y agentes IA trabajando en el proyecto Skeptic.

## 📁 Estructura de Carpetas

```
.kiro/
├── README.md                  # Este archivo - índice principal
├── AGENTS.md                  # Guía principal para agentes IA
├── CLAUDE.md                  # Configuración específica para Claude
├── adr/                       # Architecture Decision Records
│   ├── 0001-public-contract.md
│   └── 0002-model-provider-strategy.md
└── steering/                  # Guías de contexto y workflow
    ├── team-guide.md
    ├── product-spec.md
    └── preflight.md
```

---

## 🎯 ¿Por Dónde Empezar?

### 👤 **Soy un Colaborador Humano Nuevo**

Lee en este orden:

1. **[steering/team-guide.md](steering/team-guide.md)** - Workflow de desarrollo y checklist de PRs
2. **[steering/product-spec.md](steering/product-spec.md)** - Especificación completa del producto (v1.1)
3. **[../README.md](../README.md)** - README principal del repo
4. **[adr/0001-public-contract.md](adr/0001-public-contract.md)** - Contratos públicos congelados
5. **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Guía de contribución

**Quick Start:**
```bash
git clone https://github.com/pol-cova/Skeptic.git && cd Skeptic
pnpm install && pnpm demo:dev
# Demo: http://127.0.0.1:3100/login (demo / skeptic-demo)
```

---

### 🤖 **Soy un Agente IA**

Lee en este orden:

1. **[AGENTS.md](AGENTS.md)** - Guía completa para agentes (spec-driven development)
2. **Issue asignado en GitHub** - Tu spec específica con acceptance criteria
3. **ADRs relevantes** - Decisiones arquitectónicas que afectan tu issue
4. **[steering/product-spec.md](steering/product-spec.md)** - Contexto general del producto

**Workflow obligatorio:**
```
PICK ISSUE → PLAN → IMPLEMENT → VERIFY → PR
```

**Nunca cambies sin ADR:**
- Nombres de verdicts
- Precedencia de readiness
- Formas de CLI
- Alcance del MVP
- Contrato de model provider

---

### 🎥 **Soy un Reviewer de Demo**

1. **[steering/product-spec.md](steering/product-spec.md)** - Sección §4 (Reference demo)
2. Ejecuta la demo localmente (ver Quick Start arriba)
3. **[../examples/demo-app/README.md](../examples/demo-app/README.md)** - Detalles de la demo app

**Demo con bug:**
```bash
pnpm demo:dev
```

**Demo arreglada:**
```bash
pnpm --filter demo-app dev:fixed
```

---

## 📖 Guías por Tema

### **Arquitectura y Contratos**

| Documento | Descripción |
|-----------|-------------|
| [adr/0001-public-contract.md](adr/0001-public-contract.md) | Verdicts, readiness, CLI, MVP boundary (FROZEN) |
| [adr/0002-model-provider-strategy.md](adr/0002-model-provider-strategy.md) | Providers: Bedrock, ChatGPT, OpenRouter, Cerebras |

### **Product & Workflow**

| Documento | Descripción |
|-----------|-------------|
| [steering/product-spec.md](steering/product-spec.md) | Spec completa v1.1 - producto, arquitectura, delivery |
| [steering/team-guide.md](steering/team-guide.md) | Workflow SDD, PR checklist, progreso del proyecto |
| [steering/preflight.md](steering/preflight.md) | Checks de toolchain: Eve, Playwright, Bedrock, etc. |

### **Configuración de Agentes**

| Documento | Descripción |
|-----------|-------------|
| [AGENTS.md](AGENTS.md) | Guía maestra para agentes IA (READ FIRST) |
| [CLAUDE.md](CLAUDE.md) | Configuración específica para Claude Code |

---

## 🔑 Conceptos Clave del Proyecto

### **Los 4 Verdicts (FROZEN)**

```typescript
PASS           // Evidencia determinística prueba el criterio
FAIL           // Evidencia determinística refuta el criterio
UNVERIFIABLE   // Prerequisito faltante (NO es fallo del producto)
HARNESS_ERROR  // Skeptic falló (NO es veredicto del producto)
```

### **Readiness Agregado (Precedencia)**

```typescript
1. Any HARNESS_ERROR → ERROR (exit 3)
2. Else any UNVERIFIABLE → INCOMPLETE (exit 2)
3. Else any FAIL → NOT_READY (exit 1)
4. Else → READY (exit 0)
```

### **CLI Commands (FROZEN)**

```bash
skeptic verify --config <path>
skeptic replay --run <run-id>
skeptic report --run <run-id>
```

---

## 🏗️ Arquitectura de Paquetes

```
packages/
  core/                 # Tipos, schemas Zod, config, parsing
  cli/                  # CLI commands
  playwright-harness/   # Browser control aislado
  report/               # HTML/Markdown reports
  skeptic/              # Package npm publicable
agent/                  # Eve verification agent
examples/demo-app/      # App demo Next.js
```

---

## 📋 Spec-Driven Development (SDD)

**GitHub issues son las specs.**

- **Epic:** [Issue #1](https://github.com/pol-cova/Skeptic/issues/1) - Master checklist
- **P0 issues:** #2–#21 (Outcome, Scope, Acceptance criteria, Blocked by, Exit gate)

### Workflow Humano

```bash
# 1. Pick issue (blockers cerrados)
# 2. Branch: issue-N-short-name
git checkout -b issue-14-prerequisites

# 3. Develop
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# 4. PR: Closes #14, Test plan con acceptance criteria
```

### Workflow Agente

Ver **[AGENTS.md](AGENTS.md)** - Sección "SDD workflow for agents"

---

## ✅ PR Checklist

Antes de abrir un PR:

- [ ] Linked a **un solo** issue P0
- [ ] Acceptance criteria cubiertos en Test plan
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pasa
- [ ] No secrets ni `.proof/` committed
- [ ] Branch nombrado: `issue-N-short-name`

---

## 🚀 Comandos Útiles

```bash
# Development
pnpm dev                # Start Eve agent
pnpm demo:dev           # Run demo app (:3100)
pnpm demo:dev:fixed     # Run demo app (fixed)

# Quality checks
pnpm typecheck          # TypeScript
pnpm test               # Vitest
pnpm lint               # ESLint + Prettier
pnpm build              # Build all packages

# Preflight
pnpm preflight:eve
pnpm preflight:playwright
pnpm preflight:model
pnpm preflight:bedrock

# Format
pnpm format:write       # Fix Prettier issues
```

---

## 🔗 Links Importantes

### En este Repo

- [AGENTS.md](AGENTS.md) - Guía principal para agentes IA
- [../README.md](../README.md) - README principal
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Guía de contribución
- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) - Código de conducta
- [../examples/demo-app/](../examples/demo-app/) - Demo app

### External

- [Epic #1 (GitHub)](https://github.com/pol-cova/Skeptic/issues/1) - Master spec
- [All P0 Issues](https://github.com/pol-cova/Skeptic/issues?q=is%3Aissue+label%3Apriority%3AP0) - Specs individuales
- [Eve Framework Docs](https://eve.dev/docs) - Documentación de Eve
- [Playwright Docs](https://playwright.dev) - Documentación de Playwright

---

## 📊 Estado del Proyecto

**Completado:** #2–#6 (contract, preflight, monorepo, demo, core schemas)

**En Progreso:** #7–#21 (lifecycle, harness, evidence, oracle, gates, CLI, reports)

**Siguiente:** Ver [steering/team-guide.md](steering/team-guide.md) - Sección "Progress"

---

## 🆘 ¿Necesitas Ayuda?

1. **Lee primero:** [steering/team-guide.md](steering/team-guide.md)
2. **Busca issues:** [GitHub Issues](https://github.com/pol-cova/Skeptic/issues)
3. **Revisa ADRs:** [adr/](adr/) - Decisiones congeladas
4. **Consulta spec:** [steering/product-spec.md](steering/product-spec.md)

---

## 📝 Notas de Versión

- **v1.1** (2026-07-24): Estructura organizada en `.kiro/`, ADRs separados, steering guides
- **v1.0**: Estructura inicial con documentación dispersa

---

**Last Updated:** 2026-07-25  
**Maintainer:** Skeptic Team  
**License:** Apache-2.0
