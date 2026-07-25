# Plan de Implementación - Issue #7

**Assignee:** @Unodetantosluises (Luis Diaz)  
**Branch:** `issue-7-app-lifecycle`  
**Status:** Planning Phase

---

## 📋 Resumen del Issue

### **Outcome**

Iniciar o reusar la aplicación target de forma segura y clasificar fallos de startup separadamente de fallos del producto.

### **Alcance**

- ✅ Ejecutar el comando de inicio configurado a través de un child process controlado
- ✅ Poll al readiness path configurado con timeout y diagnósticos útiles
- ✅ Soportar comando de inicio omitido para apps ya corriendo
- ✅ Trackear ownership y terminar solo el proceso creado por Skeptic

### **Criterios de Aceptación**

1. ✅ El trabajo de navegador inicia solo después de que readiness tenga éxito
2. ✅ Timeout de readiness produce `HARNESS_ERROR` y exit code 3
3. ✅ Procesos de app existentes son reusados y nunca killed
4. ✅ Proceso creado se limpia en success, failure, signal, y exception
5. ✅ Logs de startup redactan secrets configurados

---

## 🔍 Análisis de Dependencias

### **Dependencias Resueltas**

- ✅ Issue #6 - Config y schemas ya implementados en `packages/core/src/`
- ✅ Issue #5 - Demo app disponible en `examples/demo-app/`

### **Config Disponible (desde #6)**

```typescript
// packages/core/src/config.ts ya tiene:
interface ProofConfig {
  app: {
    baseUrl: string;
    startCommand?: string; // ← Optional para apps ya corriendo
    readyPath: string;
    allowedOrigins: string[];
  };
  // ... otros campos
}
```

---

## 🏗️ Arquitectura Propuesta

### **Nuevo Módulo en `packages/core/src/`**

```
packages/core/src/
├── app-lifecycle.ts          # Nuevo - lógica principal
├── app-lifecycle.test.ts     # Nuevo - tests
└── index.ts                  # Actualizar exports
```

### **Estructura de `app-lifecycle.ts`**

```typescript
// Tipos principales
interface AppProcess {
  pid: number;
  owned: boolean; // true si Skeptic lo creó
  startedAt: number;
}

interface StartAppOptions {
  baseUrl: string;
  startCommand?: string;
  readyPath: string;
  timeoutMs?: number; // Default 30000
  pollIntervalMs?: number; // Default 1000
}

interface StartAppResult {
  process: AppProcess | null;
  ready: boolean;
  error?: string;
}

// Funciones principales
export async function startOrReuseApp(
  opts: StartAppOptions,
): Promise<StartAppResult>;
export async function waitForReadiness(
  baseUrl: string,
  readyPath: string,
  timeoutMs: number,
): Promise<boolean>;
export async function stopApp(process: AppProcess | null): Promise<void>;
```

---

## 📝 Plan de Implementación

### **Fase 1: Funciones de Readiness Check**

```typescript
// 1.1 - waitForReadiness
async function waitForReadiness(
  baseUrl: string,
  readyPath: string,
  timeoutMs: number,
): Promise<boolean> {
  // Poll GET ${baseUrl}${readyPath}
  // Retry con exponential backoff
  // Return true si 200 OK, false si timeout
}

// 1.2 - checkReadiness (single attempt)
async function checkReadiness(url: string): Promise<boolean> {
  // Single HTTP GET
  // Return true si response OK (status 200-299)
}
```

**Tests:**

- ✅ Successful readiness (mock server responde 200)
- ✅ Timeout readiness (mock server no responde)
- ✅ Server responde con error (500, 404)

---

### **Fase 2: Process Management**

```typescript
// 2.1 - startAppProcess
async function startAppProcess(command: string): Promise<ChildProcess> {
  // spawn process con Node child_process
  // Detach process para que sobreviva si Skeptic crashea
  // Capturar stdout/stderr para logs
  // Return process handle
}

// 2.2 - isProcessRunning
function isProcessRunning(pid: number): boolean {
  // Check si process con PID existe
  // platform-independent (Windows vs Unix)
}

// 2.3 - stopProcess
async function stopProcess(pid: number): Promise<void> {
  // Graceful shutdown: SIGTERM primero
  // Force kill si no responde: SIGKILL
  // Wait for process exit
}
```

**Tests:**

- ✅ Start process y detectar PID
- ✅ Stop owned process correctamente
- ✅ Cleanup en exception/signal

---

### **Fase 3: Orchestration Logic**

```typescript
// 3.1 - startOrReuseApp (main function)
export async function startOrReuseApp(
  opts: StartAppOptions,
): Promise<StartAppResult> {
  let process: AppProcess | null = null;

  // Si NO hay startCommand:
  if (!opts.startCommand) {
    // Intentar readiness check en baseUrl
    const ready = await waitForReadiness(
      opts.baseUrl,
      opts.readyPath,
      opts.timeoutMs ?? 30000,
    );

    if (!ready) {
      throw new Error("App not running and no startCommand provided");
    }

    return { process: null, ready: true };
  }

  // Si HAY startCommand:
  // 1. Check si app ya está corriendo
  const alreadyRunning = await checkReadiness(
    `${opts.baseUrl}${opts.readyPath}`,
  );

  if (alreadyRunning) {
    // Reuse existing
    return { process: null, ready: true };
  }

  // 2. Start new process
  const childProcess = await startAppProcess(opts.startCommand);

  process = {
    pid: childProcess.pid!,
    owned: true,
    startedAt: Date.now(),
  };

  // 3. Wait for readiness
  const ready = await waitForReadiness(
    opts.baseUrl,
    opts.readyPath,
    opts.timeoutMs ?? 30000,
  );

  if (!ready) {
    // Cleanup y throw
    await stopProcess(process.pid);
    throw new Error(`App startup timeout after ${opts.timeoutMs}ms`);
  }

  return { process, ready };
}
```

**Tests:**

- ✅ Reuse existing app (ya corriendo)
- ✅ Start new app successfully
- ✅ Timeout produce error y cleanup
- ✅ Start without startCommand cuando app ya corre
- ✅ Error cuando no hay startCommand y app no corre

---

### **Fase 4: Redacción de Secrets**

```typescript
// 4.1 - Usar secrets.ts existente
import { redactSecrets } from "./secrets.ts";

// En logs de startup:
function logStartup(command: string, secrets: string[]): void {
  const redacted = redactSecrets(command, secrets);
  console.log(`Starting app: ${redacted}`);
}
```

**Tests:**

- ✅ Passwords redactados en logs
- ✅ Env vars con secrets no aparecen en output

---

### **Fase 5: Error Handling & HARNESS_ERROR**

```typescript
// 5.1 - Clasificar errores
export class AppStartupError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AppStartupError";
  }
}

// En startOrReuseApp:
try {
  // ... startup logic
} catch (error) {
  // Cualquier error aquí debe producir HARNESS_ERROR
  throw new AppStartupError("App startup failed", error);
}
```

**Integration con Verdicts:**

```typescript
// En el caller (CLI o harness):
try {
  await startOrReuseApp(config.app);
} catch (error) {
  if (error instanceof AppStartupError) {
    // Produce HARNESS_ERROR verdict
    return {
      verdict: "HARNESS_ERROR",
      explanation: error.message,
    };
  }
  throw error;
}
```

---

### **Fase 6: Cleanup & Signal Handling**

```typescript
// 6.1 - Setup cleanup handlers
let ownedProcess: AppProcess | null = null;

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(143);
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception:", error);
  await cleanup();
  process.exit(1);
});

async function cleanup() {
  if (ownedProcess) {
    await stopApp(ownedProcess);
  }
}
```

**Tests:**

- ✅ Cleanup en SIGINT
- ✅ Cleanup en SIGTERM
- ✅ Cleanup en uncaught exception
- ✅ No cleanup de procesos no owned

---

## 🧪 Plan de Testing

### **Unit Tests (app-lifecycle.test.ts)**

```typescript
describe("app-lifecycle", () => {
  describe("waitForReadiness", () => {
    it("returns true when server responds 200", async () => {});
    it("returns false on timeout", async () => {});
    it("retries on transient failures", async () => {});
  });

  describe("startOrReuseApp", () => {
    it("reuses existing app process", async () => {});
    it("starts new app when not running", async () => {});
    it("throws on timeout", async () => {});
    it("throws when no startCommand and app not running", async () => {});
  });

  describe("stopApp", () => {
    it("stops owned process", async () => {});
    it("does nothing for non-owned process", async () => {});
    it("handles process already stopped", async () => {});
  });

  describe("secret redaction", () => {
    it("redacts secrets in startup logs", () => {});
  });
});
```

### **Integration Tests**

```typescript
describe("app-lifecycle integration", () => {
  it("starts demo app and waits for readiness", async () => {
    const result = await startOrReuseApp({
      baseUrl: "http://127.0.0.1:3100",
      startCommand: "pnpm --filter demo-app dev",
      readyPath: "/health",
      timeoutMs: 30000,
    });

    expect(result.ready).toBe(true);
    expect(result.process).toBeTruthy();

    // Cleanup
    await stopApp(result.process);
  });

  it("reuses already running demo app", async () => {
    // Start app manually first
    // Then call startOrReuseApp
    // Expect no new process created
  });
});
```

---

## 📦 Archivos a Crear/Modificar

### **Nuevos Archivos**

- `packages/core/src/app-lifecycle.ts` (main implementation)
- `packages/core/src/app-lifecycle.test.ts` (tests)

### **Archivos a Modificar**

- `packages/core/src/index.ts` (export new functions)
- `packages/core/package.json` (si necesitamos nuevas deps)

---

## 🚀 Orden de Implementación

1. **Crear archivo `app-lifecycle.ts` con tipos** (5 min)
2. **Implementar `checkReadiness` y `waitForReadiness`** (30 min)
3. **Tests para readiness functions** (20 min)
4. **Implementar `startAppProcess` y `stopProcess`** (40 min)
5. **Tests para process management** (20 min)
6. **Implementar `startOrReuseApp` orchestration** (45 min)
7. **Tests para orchestration** (30 min)
8. **Agregar secret redaction** (15 min)
9. **Tests para secrets** (10 min)
10. **Signal handlers y cleanup** (20 min)
11. **Tests de cleanup** (15 min)
12. **Integration tests con demo app** (30 min)
13. **Export desde index.ts** (5 min)
14. **Run full test suite** (10 min)

**Total estimado:** ~4.5 horas

---

## ✅ Definition of Done

- [ ] Todos los acceptance criteria cubiertos
- [ ] Unit tests pasan (`pnpm test`)
- [ ] Integration tests con demo app pasan
- [ ] Type checking pasa (`pnpm typecheck`)
- [ ] Lint pasa (`pnpm lint`)
- [ ] Build pasa (`pnpm build`)
- [ ] Secrets redactados en logs
- [ ] No process leaks (verified con process monitoring)
- [ ] PR abierto con link a issue #7
- [ ] Test plan en PR description mapea a acceptance criteria

---

## 🤔 Assumptions & Preguntas

### **Assumptions**

1. El demo app health check está en `/health` (verificar en demo app)
2. Timeout default de 30 segundos es razonable
3. Usamos Node `child_process` nativo (no external libs)
4. Secrets vienen de `config.auth.*Env` fields

### **Preguntas para Resolver Antes**

1. ¿El `/health` endpoint ya existe en demo app? → Verificar
2. ¿Qué plataforma priorizar? (Windows/Unix signals diferentes)
3. ¿Debemos loggear stdout/stderr del app process?

---

## 📚 Referencias

- [ADR 0001](../docs/adr/0001-public-contract.md) - HARNESS_ERROR classification
- [Product Spec](./product-spec.md) §7.2 - Config shape
- [Issue #6](https://github.com/pol-cova/Skeptic/issues/6) - Config implementation
- [Issue #5](https://github.com/pol-cova/Skeptic/issues/5) - Demo app
- [Node child_process docs](https://nodejs.org/api/child_process.html)

---

**Created:** 2026-07-25  
**Author:** Luis Diaz  
**Next Step:** Verificar `/health` endpoint en demo app antes de empezar implementación
