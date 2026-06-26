/**
 * Boots the CodeQuest Socket.IO duel server with health checks and CORS.
 */

import config from "config";
import http from "http";
import { Server } from "socket.io";
import { connectDatabase, prisma } from "@project/db";
import { resolveSocketIoCors } from "@project/server-kit/cors";
import { logError, logInfo } from "@project/server-kit/logger";
import { validateIoProductionSecuritySettings } from "@project/server-kit/validateIoSecurity";
import { attachDuelNamespace } from "./socket/duel/index.js";

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

// 1. Create the base HTTP Server.
// This server acts as the "Entry Point". Every WebSocket connection starts 
// as a standard HTTP request before being upgraded to a permanent socket.
const server = http.createServer((req, res) => {
  // Providing a standard HTTP endpoint for infrastructure health checks
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "codequest-io" }));
    return;
  }
  // Catch-all for any other regular HTTP requests that aren't Socket.IO related
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// 2. Initialize Socket.IO on top of the HTTP Server.
// Socket.IO "binds" to the server. When a client sends a request with an 
// "Upgrade: websocket" header, Socket.IO intercepts it and handles the handshake.
const io = new Server(server, {
  cors: resolveSocketIoCors(),
  // Min detection: 9 s (> client 8 s grace); max detection: 3 + 9 = 12 s.
  pingInterval: 3_000,
  pingTimeout: 9_000,
});

// 3. Attach application logic (Namespaces/Events) to the IO instance.
attachDuelNamespace(io);

// 4. Start listening on the network.
// The same port now handles both standard HTTP (/health) and 
// WebSocket upgrades for real-time communication.
const port = Number(config.get<number | string>("app.port"));
const host = config.get<string>("app.host");

server.listen(port, host, () => {
  logInfo("[IO]", "server-started", {
    port,
    host,
    localUrl: `http://localhost:${port}`,
  });
});

async function shutdown() {
  io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);