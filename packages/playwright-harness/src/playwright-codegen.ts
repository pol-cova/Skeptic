import {
  assertReplayableActions,
  parseReplayFixture,
  ReplayGenerationError,
  type BrowserAction,
  type ElementTarget,
  type ReplayFixture,
} from "@skeptic/core";

function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function renderTarget(target: ElementTarget): string {
  if (target.testId !== undefined) {
    return `page.getByTestId('${escapeString(target.testId)}')`;
  }

  if (target.role !== undefined) {
    if (target.name !== undefined) {
      return `page.getByRole('${escapeString(target.role)}', { name: '${escapeString(target.name)}' })`;
    }
    return `page.getByRole('${escapeString(target.role)}')`;
  }

  if (target.label !== undefined) {
    return `page.getByLabel('${escapeString(target.label)}')`;
  }

  if (target.placeholder !== undefined) {
    return `page.getByPlaceholder('${escapeString(target.placeholder)}')`;
  }

  if (target.text !== undefined) {
    return `page.getByText('${escapeString(target.text)}')`;
  }

  throw new ReplayGenerationError(
    "Unsupported trace: target lacks stable locator fields for codegen.",
  );
}

function renderAction(action: BrowserAction, baseUrl: string): string[] {
  switch (action.type) {
    case "goto":
      return [`await page.goto('${escapeString(action.url)}');`];
    case "click":
      return [`await ${renderTarget(action.target)}.click();`];
    case "fill":
      return [
        `await ${renderTarget(action.target)}.fill('${escapeString(action.value)}');`,
      ];
    case "select":
      return [
        `await ${renderTarget(action.target)}.selectOption('${escapeString(action.value)}');`,
      ];
    case "press":
      return action.target
        ? [
            `await ${renderTarget(action.target)}.press('${escapeString(action.key)}');`,
          ]
        : [`await page.keyboard.press('${escapeString(action.key)}');`];
    case "waitFor":
      if (!action.target) {
        throw new ReplayGenerationError(
          "Unsupported trace: waitFor without target cannot be codegen'd.",
        );
      }
      return [
        `await ${renderTarget(action.target)}.waitFor({ timeout: ${action.timeoutMs ?? 10_000} });`,
      ];
    case "assert": {
      const assertion = action.assertion;
      switch (assertion.type) {
        case "visible":
          return [
            `await expect(${renderTarget(assertion.target)}).toBeVisible();`,
          ];
        case "hidden":
          return [
            `await expect(${renderTarget(assertion.target)}).toBeHidden();`,
          ];
        case "text":
          return [
            `await expect(${renderTarget(assertion.target)}).toContainText('${escapeString(assertion.expected)}');`,
          ];
        case "count":
          return [
            `await expect(${renderTarget(assertion.target)}).toHaveCount(${assertion.expected});`,
          ];
        case "url":
          return [
            `await expect(page).toHaveURL('${escapeString(assertion.expected)}');`,
          ];
        case "response":
          return [
            `// response assertion: ${assertion.method} ${assertion.path} -> ${assertion.status}`,
            `// verified during Skeptic run via network log`,
          ];
        default:
          throw new ReplayGenerationError(
            `Unsupported assertion type for codegen.`,
          );
      }
    }
    default:
      throw new ReplayGenerationError(
        `Unsupported action type for codegen: ${(action as BrowserAction).type}`,
      );
  }
}

function substituteForCodegen(
  value: string,
  variables: Record<string, string>,
): string {
  return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const replacement = variables[key];
    if (replacement === undefined) {
      return `{{${key}}}`;
    }
    return replacement;
  });
}

function prepareFixtureForCodegen(fixture: ReplayFixture): ReplayFixture {
  const variables = fixture.variables ?? {};
  const criteria = fixture.criteria.map((criterion) => ({
    ...criterion,
    steps: criterion.steps.map((step) => {
      const clone = structuredClone(step);
      if (clone.type === "fill" || clone.type === "select") {
        clone.value = substituteForCodegen(clone.value, variables);
      }
      if (clone.type === "goto") {
        clone.url = substituteForCodegen(clone.url, variables);
      }
      return clone;
    }),
  }));

  return { ...fixture, criteria };
}

export function generatePlaywrightSpec(fixtureInput: ReplayFixture): string {
  const fixture = parseReplayFixture(fixtureInput);
  const codegenFixture = prepareFixtureForCodegen(fixture);

  for (const criterion of codegenFixture.criteria) {
    assertReplayableActions(criterion.steps);
  }

  const tests = codegenFixture.criteria.map((criterion) => {
    const title = `[${criterion.criterionIndex}] ${criterion.sourceText.replace(/'/g, "\\'")}`;
    const apiLines = (criterion.beforeSteps ?? []).map(
      (step) =>
        `  await page.request.${step.method.toLowerCase()}('${escapeString(fixture.baseUrl)}${escapeString(step.path)}');`,
    );

    const actionLines = criterion.steps.flatMap((step) =>
      renderAction(step, fixture.baseUrl).map((line) => `  ${line}`),
    );

    return `test('${title}', async ({ page }) => {
${apiLines.join("\n")}
${actionLines.join("\n")}
});`;
  });

  return `import { test, expect } from '@playwright/test';

const baseURL = '${escapeString(fixture.baseUrl)}';

test.use({ baseURL });

${tests.join("\n\n")}
`;
}

export function generatePlaywrightSpecFromFixture(fixture: unknown): string {
  return generatePlaywrightSpec(parseReplayFixture(fixture));
}
