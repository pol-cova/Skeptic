import eslint from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/.output/**",
      "**/.eve/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/pnpm-lock.yaml",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
