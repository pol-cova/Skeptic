import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ProofCriteriaConfig } from "./config.schema.ts";
import { criterionSchema, type Criterion } from "./schemas/criterion.ts";

const numberedCriterionPattern = /^(\d+)\.\s+(.*)$/;

export interface ParseCriteriaOptions {
  maxCriteria: number;
}

export interface ParseCriteriaResult {
  criteria: Criterion[];
}

export function parseCriteriaMarkdown(
  content: string,
  options: ParseCriteriaOptions,
): ParseCriteriaResult {
  const lines = content.split(/\r?\n/u);
  const criteria: Criterion[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const match = numberedCriterionPattern.exec(trimmed);
    if (!match) {
      continue;
    }

    const index = Number(match[1]);
    const sourceText = match[2];

    if (!Number.isInteger(index) || index < 1) {
      throw new Error(`Invalid criterion index "${match[1]}" in acceptance criteria.`);
    }

    if (sourceText.length === 0) {
      throw new Error(`Criterion ${index} is empty.`);
    }

    if (criteria.some((criterion) => criterion.index === index)) {
      throw new Error(`Duplicate criterion index ${index} in acceptance criteria.`);
    }

    criteria.push(
      criterionSchema.parse({
        index,
        sourceText,
        prerequisites: [],
      }),
    );
  }

  if (criteria.length === 0) {
    throw new Error("No numbered acceptance criteria were found in the Markdown file.");
  }

  criteria.sort((left, right) => left.index - right.index);

  for (let position = 0; position < criteria.length; position += 1) {
    const expectedIndex = position + 1;
    if (criteria[position]?.index !== expectedIndex) {
      throw new Error(
        `Acceptance criteria must use contiguous numbering starting at 1; missing criterion ${expectedIndex}.`,
      );
    }
  }

  if (criteria.length > options.maxCriteria) {
    throw new Error(
      `Acceptance criteria file defines ${criteria.length} criteria, but the configured maximum is ${options.maxCriteria}.`,
    );
  }

  return { criteria };
}

export function loadCriteriaFromFile(
  criteriaConfig: ProofCriteriaConfig,
  options?: { baseDir?: string },
): ParseCriteriaResult {
  const filePath = resolve(options?.baseDir ?? process.cwd(), criteriaConfig.file);
  const content = readFileSync(filePath, "utf8");
  return parseCriteriaMarkdown(content, {
    maxCriteria: criteriaConfig.maxCriteria,
  });
}

export function withPrerequisites(
  criteria: readonly Criterion[],
  prerequisitesByIndex: Readonly<Record<number, readonly number[]>>,
): Criterion[] {
  return criteria.map((criterion) => {
    const prerequisites = prerequisitesByIndex[criterion.index] ?? [];
    return criterionSchema.parse({
      ...criterion,
      prerequisites: [...prerequisites],
    });
  });
}
