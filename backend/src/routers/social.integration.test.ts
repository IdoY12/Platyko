import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@project/db";
import { app } from "../app.js";
import { signAccessToken } from "../utils/sessionJwtTokens.js";

/**
 * PRD phase 4 success condition: a blocked or private user is not exposed on any route. Runs
 * against a real database (CI's migrations job, or a local one) when INTEGRATION_DATABASE=1.
 */
const RUN = process.env.INTEGRATION_DATABASE === "1";
const PREFIX = `it${Date.now().toString(36)}`;

type TestUser = { id: string; username: string; email: string; friendCode: string; token: string };

let server: Server;
let base = "";
const users: Record<string, TestUser> = {};

async function makeUser(name: string, data: Record<string, unknown> = {}): Promise<TestUser> {
  const username = `${PREFIX}${name}`;
  const email = `${username}@example.test`;
  const row = await prisma.user.create({ data: { username, email, ...data }, select: { id: true, friendCode: true, tokenVersion: true } });
  return { id: row.id, username, email, friendCode: row.friendCode, token: signAccessToken({ userId: row.id, email, tokenVersion: row.tokenVersion }) };
}

async function call(as: TestUser, method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown; text: string }> {
  const response = await fetch(`${base}/api/social${path}`, { method, headers: { authorization: `Bearer ${as.token}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? (JSON.parse(text) as unknown) : null, text };
}

const usernamesIn = (json: unknown): string[] => JSON.stringify(json).match(new RegExp(`${PREFIX}[a-z]+`, "g")) ?? [];

describe.skipIf(!RUN)("social routes never expose a blocked or private user", () => {
  beforeAll(async () => {
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    users.viewer = await makeUser("viewer");
    users.blocker = await makeUser("blocker");
    users.hidden = await makeUser("hidden", { profileVisibility: "NOBODY" });
    users.friendsonly = await makeUser("friendsonly", { profileVisibility: "FRIENDS" });
    users.unsearchable = await makeUser("unsearchable", { searchable: false });
    users.codeonly = await makeUser("codeonly", { friendRequestPolicy: "CODE_ONLY" });
    users.decliner = await makeUser("decliner");
    await prisma.block.create({ data: { blockerId: users.blocker.id, blockedId: users.viewer.id } });
  });

  afterAll(async () => {
    await prisma.match.deleteMany({ where: { roomCode: PREFIX } });
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
    server.close();
  });

  it("search shows only searchable, visible, unblocked users, and never an email", async () => {
    const result = await call(users.viewer, "GET", `/search?q=${PREFIX}`);
    expect(result.status).toBe(200);
    expect(usernamesIn(result.json).sort()).toEqual([users.codeonly.username, users.decliner.username]);
    expect(result.text).not.toContain("@");
  });

  it("played recently lists real opponents only, never a blocker, a hidden profile or a ghost", async () => {
    const seat = (userId: string, index: number, isGhost = false) => ({ userId, seat: index, placement: index + 1, score: 0, correctCount: 0, correctTimeMs: 0, answers: [], isGhost });
    await prisma.match.create({
      data: {
        mode: "ROOM", track: "BEGINNER", rounds: 5, itemIds: [], roomCode: PREFIX, startedAt: new Date(), endedAt: new Date(),
        participants: { create: [seat(users.viewer.id, 0), seat(users.blocker.id, 1), seat(users.hidden.id, 2), seat(users.decliner.id, 3, true)] },
      },
    });
    await prisma.match.create({ data: { mode: "ROOM", track: "BEGINNER", rounds: 5, itemIds: [], roomCode: PREFIX, startedAt: new Date(), endedAt: new Date(), participants: { create: [seat(users.viewer.id, 0), seat(users.codeonly.id, 1)] } } });
    const result = await call(users.viewer, "GET", "/recent");
    expect(result.status).toBe(200);
    expect(usernamesIn(result.json)).toEqual([users.codeonly.username]);
  });

  it("a profile behind a block or privacy reads as missing", async () => {
    for (const hiddenUser of [users.blocker, users.hidden, users.friendsonly]) {
      const result = await call(users.viewer, "GET", `/users/${hiddenUser.username}`);
      expect(result.status).toBe(404);
      expect(result.text).not.toContain(hiddenUser.username);
    }
    expect((await call(users.viewer, "GET", `/users/${users.unsearchable.username}`)).status).toBe(200);
  });

  it("a blocked user cannot reach the blocker by name or by code, and learns nothing", async () => {
    const byName = await call(users.viewer, "POST", "/friends/requests", { username: users.blocker.username });
    const byCode = await call(users.viewer, "POST", "/friends/requests", { friendCode: users.blocker.friendCode });
    const missing = await call(users.viewer, "POST", "/friends/requests", { username: `${PREFIX}nobodyhere` });
    expect([byName.status, byCode.status]).toEqual([404, 404]);
    expect(byName.json).toEqual(missing.json);
    expect(usernamesIn((await call(users.blocker, "GET", "/friends")).json)).toEqual([]);
  });

  it("blocking ends a friendship and hides both users from each other", async () => {
    await call(users.viewer, "POST", "/friends/requests", { username: users.friendsonly.username });
    const incoming = (await call(users.friendsonly, "GET", "/friends")).json as { incoming: { id: string }[] };
    await call(users.friendsonly, "POST", `/friends/requests/${incoming.incoming[0].id}/accept`);
    expect((await call(users.viewer, "GET", `/users/${users.friendsonly.username}`)).status).toBe(200);
    await call(users.friendsonly, "POST", "/blocks", { userId: users.viewer.id });
    expect(usernamesIn((await call(users.viewer, "GET", "/friends")).json)).toEqual([]);
    expect((await call(users.viewer, "GET", `/users/${users.friendsonly.username}`)).status).toBe(404);
  });

  it("a code-only user takes requests by code, and a decline is never reported to the sender", async () => {
    expect((await call(users.viewer, "POST", "/friends/requests", { username: users.codeonly.username })).status).toBe(403);
    expect((await call(users.viewer, "POST", "/friends/requests", { friendCode: users.codeonly.friendCode })).json).toEqual({ outcome: "sent" });
    await call(users.viewer, "POST", "/friends/requests", { username: users.decliner.username });
    const incoming = (await call(users.decliner, "GET", "/friends")).json as { incoming: { id: string }[] };
    await call(users.decliner, "POST", `/friends/requests/${incoming.incoming[0].id}/decline`);
    expect((await call(users.viewer, "POST", "/friends/requests", { username: users.decliner.username })).json).toEqual({ outcome: "sent" });
    expect(((await call(users.decliner, "GET", "/friends")).json as { incoming: unknown[] }).incoming).toEqual([]);
  });
});
