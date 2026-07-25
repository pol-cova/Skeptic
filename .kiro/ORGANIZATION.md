# 📂 Organización de la Carpeta .kiro

Este documento explica cómo están organizados los archivos en `.kiro/` y su propósito.

## 🗂️ Estructura Final

```
.kiro/
├── README.md                           # 📘 Índice principal - START HERE
├── ORGANIZATION.md                     # 📋 Este archivo - explicación de estructura
├── AGENTS.md                           # 🤖 Guía maestra para agentes IA
├── CLAUDE.md                           # 💬 Config específica para Claude Code
│
├── adr/                                # 🏛️ Architecture Decision Records
│   ├── 0001-public-contract.md        #    → Verdicts, readiness, CLI (FROZEN)
│   └── 0002-model-provider-strategy.md #    → Providers y BYOC model access
│
└── steering/                           # 🧭 Guías de contexto automático
    ├── team-guide.md                   #    → Workflow SDD y PR checklist
    ├── product-spec.md                 #    → Spec completa del producto v1.1
    └── preflight.md                    #    → Toolchain checks (Eve, Playwright, etc.)
```

---

## 📁 Propósito de Cada Carpeta

### **Raíz `.kiro/`**

Archivos de entrada principales y configuración de agentes.

| Archivo           | Propósito                                             | Audiencia     |
| ----------------- | ----------------------------------------------------- | ------------- |
| `README.md`       | Índice navegable con links a toda la documentación    | Todos         |
| `ORGANIZATION.md` | Explicación de la estructura (este archivo)           | Colaboradores |
| `AGENTS.md`       | Guía completa de spec-driven development para agentes | Agentes IA    |
| `CLAUDE.md`       | Pointer a AGENTS.md para Claude Code                  | Claude Code   |

### **`adr/` - Architecture Decision Records**

Decisiones arquitectónicas **congeladas** que no pueden cambiarse sin un nuevo ADR.

| Archivo                           | Qué congela                            | Estado      |
| --------------------------------- | -------------------------------------- | ----------- |
| `0001-public-contract.md`         | Verdicts, readiness, CLI, MVP boundary | ✅ Accepted |
| `0002-model-provider-strategy.md` | Model providers, BYOC, credentials     | ✅ Accepted |

**Regla:** Ningún código puede contradecir un ADR accepted. Si necesitas cambiar algo congelado, debes crear un nuevo ADR primero.

### **`steering/` - Guías de Contexto**

Documentos que Kiro carga automáticamente como contexto para agentes.

| Archivo           | Contenido                                       | Cuándo se usa   |
| ----------------- | ----------------------------------------------- | --------------- |
| `team-guide.md`   | Workflow humano/agente, PR checklist, progreso  | Siempre         |
| `product-spec.md` | Spec completa: producto, arquitectura, delivery | Siempre         |
| `preflight.md`    | Runtime policy, preflight checks, resultados    | Setup/debugging |

---

## 🎯 Rutas de Lectura por Rol

### 👨‍💻 **Nuevo Colaborador Humano**

```
1. .kiro/README.md                    # Orientación general
2. .kiro/steering/team-guide.md       # Workflow y checklist
3. .kiro/steering/product-spec.md     # Entender el producto
4. ../README.md                        # README del repo
5. .kiro/adr/0001-public-contract.md  # Contratos congelados
```

### 🤖 **Agente IA (Primera Vez)**

```
1. .kiro/AGENTS.md                          # Guía maestra SDD
2. GitHub issue asignado                    # Tu spec específica
3. .kiro/adr/*.md                           # ADRs relevantes
4. .kiro/steering/product-spec.md           # Contexto general
```

### 🤖 **Agente IA (Issue Específico)**

```
1. .kiro/AGENTS.md - Sección "SDD workflow"
2. GitHub issue #N                          # Outcome, Scope, Acceptance
3. Blockers del issue (si existen)
4. ADRs linkados desde el issue
```

### 🎥 **Reviewer de Demo**

```
1. .kiro/steering/product-spec.md §4        # Reference demo
2. Run: pnpm demo:dev
3. ../examples/demo-app/README.md           # Demo app details
```

---

## 🔄 ¿Por Qué Esta Estructura?

### **Problema Anterior**

Los archivos estaban duplicados y dispersos:

- ADRs en `docs/adr/` Y `.kiro/`
- Guías en raíz del repo Y `.kiro/`
- No había índice claro
- Difícil encontrar documentación relevante

### **Solución Actual**

```
Separación clara de concerns:

📘 .kiro/README.md
   ↓
   ├─→ 🏛️ adr/           (Decisiones congeladas)
   ├─→ 🧭 steering/      (Guías de contexto)
   └─→ 🤖 AGENTS.md      (Workflow de agentes)
```

**Beneficios:**

- ✅ Un solo índice de entrada (README.md)
- ✅ ADRs centralizados en un solo lugar
- ✅ Steering files agrupados para Kiro
- ✅ Navegación clara por rol/necesidad
- ✅ No hay duplicación

---

## 📝 Convenciones de Nombrado

### **ADRs**

```
Format: NNNN-short-title.md
Ejemplo: 0001-public-contract.md

Reglas:
- Números secuenciales (0001, 0002, ...)
- Kebab-case para títulos
- Status: Proposed | Accepted | Deprecated | Superseded
```

### **Steering Files**

```
Format: descriptive-name.md
Ejemplo: product-spec.md, team-guide.md

Reglas:
- Nombres descriptivos claros
- Kebab-case
- Contenido siempre actualizado (living documents)
```

### **Config Files**

```
Format: ALLCAPS.md
Ejemplo: AGENTS.md, CLAUDE.md, README.md

Reglas:
- UPPERCASE para archivos de configuración/entrada
- Descriptivo del propósito principal
```

---

## 🔗 Links Entre Documentos

### **Desde README.md**

- Apunta a todos los archivos en `.kiro/`
- Provee rutas de lectura por rol
- Links a documentos externos (GitHub issues, Contributing, etc.)

### **Desde AGENTS.md**

- Referencia ADRs relevantes
- Apunta a product-spec.md para contexto
- Links a issues de GitHub (epic #1)

### **Desde Steering Files**

- Cross-reference entre ellos
- Link a ADRs cuando mencionan decisiones congeladas
- Link a código source cuando es relevante

### **Desde ADRs**

- Link a código que implementa la decisión
- Referencias a otros ADRs relacionados
- Link a issues que motivaron la decisión

---

## ✏️ Cómo Actualizar la Documentación

### **Agregar Nuevo ADR**

```bash
# 1. Crear archivo
touch .kiro/adr/0003-new-decision.md

# 2. Usar template
cat > .kiro/adr/0003-new-decision.md << 'EOF'
# ADR 0003: [Título de la Decisión]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[Contexto y problema a resolver]

## Decision

[Decisión tomada]

## Consequences

[Consecuencias positivas y negativas]
EOF

# 3. Actualizar README.md con link al nuevo ADR
```

### **Agregar Nueva Guía de Steering**

```bash
# 1. Crear en steering/
touch .kiro/steering/new-guide.md

# 2. Actualizar README.md - sección "Guías por Tema"
# 3. Cross-link desde otros steering files si es relevante
```

### **Actualizar Guía Existente**

```bash
# 1. Editar el archivo directamente
# 2. Si cambia significativamente, actualizar fecha en README.md
# 3. Verificar cross-links no estén rotos
```

---

## 🧪 Testing de la Estructura

### **Checklist de Integridad**

- [ ] Todos los links en README.md funcionan
- [ ] ADRs tienen status válido (Proposed/Accepted/etc.)
- [ ] Steering files cross-reference correctamente
- [ ] No hay archivos duplicados entre `.kiro/` y `docs/`
- [ ] Paths relativos funcionan desde cualquier archivo
- [ ] AGENTS.md tiene todos los links a issues actualizados

### **Comandos de Verificación**

```bash
# Verificar que no hay duplicados
find . -name "0001-public-contract.md" -o -name "product-spec.md"

# Verificar estructura
ls -R .kiro/

# Verificar links rotos (requiere herramienta)
# markdown-link-check .kiro/README.md
```

---

## 📚 Documentos Relacionados Fuera de .kiro/

### **En la Raíz del Repo**

- `README.md` - README principal del proyecto
- `CONTRIBUTING.md` - Guía de contribución
- `CODE_OF_CONDUCT.md` - Código de conducta
- `AGENTS.md` - Link a `.kiro/AGENTS.md`
- `CLAUDE.md` - Link a `.kiro/CLAUDE.md`

### **En docs/**

- `docs/preflight.md` - Original (puede existir como referencia)
- `docs/adr/` - Puede contener ADRs legacy (revisar si mantener)

### **En examples/**

- `examples/demo-app/README.md` - Documentación de la demo app
- `examples/demo-app/acceptance.md` - Criterios de la demo

**Nota:** La fuente de verdad está en `.kiro/`. Si hay duplicados en `docs/`, considerar eliminarlos o agregar disclaimer apuntando a `.kiro/`.

---

## 🚀 Próximos Pasos

### **Mejoras Futuras**

1. **Automatización**
   - Script para validar links rotos
   - CI check que verifica estructura de .kiro/
   - Auto-generación de índice en README.md

2. **Documentación Adicional**
   - Guía de testing (steering/testing-guide.md)
   - Guía de deployment (steering/deployment.md)
   - FAQ común (steering/faq.md)

3. **Integración con Kiro**
   - Front-matter en steering files para control de inclusión
   - Tags para filtrar guías por contexto
   - Versioning de ADRs

---

## 📞 Contacto

Si tienes preguntas sobre la organización de `.kiro/`:

1. Lee **[README.md](README.md)** primero
2. Revisa este documento (ORGANIZATION.md)
3. Busca en los steering files relevantes
4. Abre issue en GitHub si algo no está claro

---

**Creado:** 2026-07-25  
**Autor:** Luis Diaz (@luis-dev branch)  
**Versión:** 1.0
