import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => ({ map: {} as Record<string, unknown> }));
vi.mock("config", () => ({ default: { get: (key: string) => values.map[key] } }));

import { validateBackendProductionSecuritySettings } from "./validateBackendSecurity.js";
import { validateIoProductionSecuritySettings } from "./validateIoSecurity.js";

const STRONG_ACCESS = "3f9c1a7e5b2d4c6f8a0e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a";
const STRONG_REFRESH = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

function realShapedProduction(): Record<string, unknown> {
  return {
    "app.validateSecurity": true,
    "app.trustProxy": true,
    "app.jwtAccessSecret": STRONG_ACCESS,
    "app.jwtRefreshSecret": STRONG_REFRESH,
    "resend.apiKey": "re_AbCdEfGh_1234567890abcdefghijklmn",
    "resend.webhookSecret": "whsec_AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    "database.url": "postgresql://platyko:S0meRe4lP4ss@postgres:5432/platyko?schema=public",
    "app.cors.origin": "https://api.platyko.com,https://platyko.com",
    "io.cors.origin": "https://api.platyko.com",
  };
}

describe("production boot gates", () => {
  beforeEach(() => {
    values.map = realShapedProduction();
  });

  it("pass with real-shaped values", () => {
    expect(() => validateBackendProductionSecuritySettings()).not.toThrow();
    expect(() => validateIoProductionSecuritySettings()).not.toThrow();
  });

  it("are skipped outside production", () => {
    values.map = { "app.validateSecurity": false };
    expect(() => validateBackendProductionSecuritySettings()).not.toThrow();
  });

  it.each([
    ["config default", "change-me"],
    ["compose default", "secret"],
    [".env.example value", "local-dev-only-jwt-access-secret-min-32-chars!!"],
    ["human-typed long value", "my-super-long-production-secret-value-here-1234"],
    ["too short", "abc123"],
    ["empty", ""],
  ])("reject the JWT placeholder: %s", (_label, secret) => {
    values.map["app.jwtAccessSecret"] = secret;
    expect(() => validateBackendProductionSecuritySettings()).toThrow();
    expect(() => validateIoProductionSecuritySettings()).toThrow();
  });

  it.each([
    ["identical access and refresh secrets", { "app.jwtRefreshSecret": STRONG_ACCESS }],
    ["missing Resend key", { "resend.apiKey": "" }],
    ["mis-shaped Resend key", { "resend.apiKey": "sk_live_not_a_resend_key_at_all_0000000" }],
    ["mis-shaped webhook secret", { "resend.webhookSecret": "not-whsec-prefixed-value-0000000000" }],
    ["development database credentials", { "database.url": "postgresql://postgres:postgres@postgres:5432/platyko" }],
    ["non-postgres database url", { "database.url": "mysql://u:p@h/db" }],
    ["wildcard CORS", { "app.cors.origin": "*" }],
    ["plain-http CORS", { "app.cors.origin": "https://platyko.com,http://localhost:8081" }],
    ["trust proxy off", { "app.trustProxy": false }],
  ])("reject %s", (_label, overrides) => {
    Object.assign(values.map, overrides);
    expect(() => validateBackendProductionSecuritySettings()).toThrow();
  });
});
