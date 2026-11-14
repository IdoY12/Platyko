import { afterEach, describe, expect, it, vi } from "vitest";

const settings = { enabled: false, clientId: "client", clientSecret: "secret" };
vi.mock("config", () => ({ default: { get: () => settings } }));
const { githubClientId, githubProfileFromCode } = await import("./githubOAuth.js");
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

describe("GitHub sign-in", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    settings.enabled = false;
  });

  it("offers no client id while it is off", () => {
    expect(githubClientId()).toBeNull();
    settings.enabled = true;
    expect(githubClientId()).toBe("client");
  });

  it("exchanges the code with the secret on the server and keeps only the primary verified email", async () => {
    settings.enabled = true;
    const fetchSpy = vi.fn((url: string) =>
      url.endsWith("/access_token")
        ? json({ access_token: "token" })
        : url.endsWith("/user")
          ? json({ id: 42, login: "octo", name: "Octo Cat" })
          : json([{ email: "old@example.test", primary: false, verified: true }, { email: "Octo@Example.test", primary: true, verified: true }]),
    );
    vi.stubGlobal("fetch", fetchSpy);
    expect(await githubProfileFromCode("code", "verifier", "com.idoyahav.platyko://oauth/github")).toEqual({ subject: "42", login: "octo", name: "Octo Cat", email: "octo@example.test" });
    const exchange = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as Record<string, string>;
    expect(exchange).toMatchObject({ client_secret: "secret", code: "code", code_verifier: "verifier" });
  });

  it("returns no email when the primary one is not verified", async () => {
    settings.enabled = true;
    vi.stubGlobal("fetch", vi.fn((url: string) => (url.endsWith("/access_token") ? json({ access_token: "t" }) : url.endsWith("/user") ? json({ id: 1, login: "a", name: null }) : json([{ email: "a@b.test", primary: true, verified: false }]))));
    expect((await githubProfileFromCode("c", "v", "r")).email).toBeUndefined();
  });
});
