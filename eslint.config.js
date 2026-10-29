import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "frontend/android/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Service workers run in their own global scope, not a page.
    files: ["**/public/sw.js"],
    languageOptions: {
      globals: { self: "readonly", caches: "readonly", fetch: "readonly" },
    },
  },
  // Keep last: turns off style rules that would fight Prettier.
  prettier,
);
