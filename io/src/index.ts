/**
 * Boots the Platyko Socket.IO duel server with health checks and CORS.
 */

import config from "config";
import http from "http";
import { Server, type DefaultEventsMap } from "socket.io";
import { connectDatabase, prisma } from "@project/db";
import { resolveSocketIoCors } from "@project/server-kit/cors";
import { logError, logInfo } from "@project/server-kit/logger";
import { validateIoProductionSecuritySettings } from "@project/server-kit/validateIoSecurity";
import { attachDuelNamespace } from "./socket/duel/index.js";
import type { DuelSocketData } from "./socket/duel/types.js";

// Global error handlers to prevent the process from crashing silently
process.on("unhandledRejection", (reason) => {
  logError("[IO]", reason, { type: "unhandledRejection" });
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logError("[IO]", error, { type: "uncaughtException" });
  process.exit(1);
});

// Security validation and Database connection before starting the server
validateIoProductionSecuritySettings();
await connectDatabase();

// Plain HTTP server: serves /health and is upgraded to WebSocket by Socket.IO.
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "platyko-io" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, DuelSocketData>(server, {
  cors: resolveSocketIoCors(),
  // Duel payloads are a few hundred bytes; the 1 MB default only helps memory-exhaustion attacks.
  maxHttpBufferSize: 16_384,
  // Min detection: 9 s (> client 8 s grace); max detection: 3 + 9 = 12 s.
  pingInterval: 3_000,
  pingTimeout: 9_000,
});

attachDuelNamespace(io);

const port = Number(config.get<number | string>("app.port"));
const host = config.get<string>("app.host");

server.listen(port, host, () => {
  logInfo("[IO]", "server-started", { port, host, localUrl: `http://localhost:${port}` });
});

/** Close sockets and the HTTP server, let handlers drain (10 s cap), then release the DB. */
async function shutdown() {
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  await io.close();
  await prisma.$disconnect();
  clearTimeout(forceExit);
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());