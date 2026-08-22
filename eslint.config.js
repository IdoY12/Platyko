// Root ESLint flat config covering backend, io, mobile, and shared packages.
const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "mobile/ios/**",
      "mobile/android/**",
      "mobile/.expo/**",
      "mobile/web-build/**",
      "packages/db/prisma/migrations/**",
      "patches/**",
      "eslint.config.js",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [
          "backend/tsconfig.json",
          "backend/tsconfig.prisma.json",
          "io/tsconfig.json",
          "mobile/tsconfig.json",
          "packages/*/tsconfig.json",
        ],
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["mobile/**/*.{ts,tsx}"],
    extends: [react.configs.flat.recommended, react.configs.flat["jsx-runtime"]],
    plugins: { "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react/prop-types": "off",
    },
  },
  {
    // Root-level tool configs are not part of any tsconfig project.
    files: ["knip.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  }
);
