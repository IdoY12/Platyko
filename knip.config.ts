/** Excluded from dead-code analysis; Vitest still treats them as entry files via its plugin. */
const testFiles = "**/*.{test,spec}.{ts,tsx}";

const prismaSchemaEntry = "../packages/db/prisma/schema.prisma";

export default {
  ignore: [testFiles],
  ignoreFiles: [
    testFiles,
    "**/prisma/migrations/**",
    "**/node_modules/.prisma/**",
    "**/.expo/**",
    "**/web-build/**",
    "**/expo-env.d.ts",
    "**/dist/**",
  ],

  workspaces: {
    ".": {
      entry: [],
      project: [],
      expo: false,
      // express-rate-limit hoists to root and resolves its Express types from here (see memory notes).
      ignoreDependencies: ["@types/express"],
    },

    backend: {
      project: ["src/**/*.ts", "prisma/seed/**/*.ts"],
      // Type augmentation target only; the types arrive through @types/express.
      ignoreDependencies: ["express-serve-static-core"],
      prisma: {
        entry: [prismaSchemaEntry],
      },
    },

    io: {
      project: ["src/**/*.ts"],
      prisma: {
        entry: [prismaSchemaEntry],
      },
    },

    mobile: {
      project: ["src/**/*.{ts,tsx}"],
      // knip's expo plugin infers expo-updates from app.json, but the app does not ship OTA updates.
      ignoreDependencies: ["expo-updates"],
      paths: {
        "@/*": ["./src/*"],
      },
    },

    "packages/db": {
      project: ["src/**/*.ts"],
      prisma: {
        entry: ["prisma/schema.prisma"],
      },
    },

    "packages/auth-jwt": {
      project: ["src/**/*.ts"],
    },

    "packages/server-kit": {
      project: ["src/**/*.ts"],
    },

    "packages/*": {
      project: ["src/**/*.ts"],
    },
  },
};
