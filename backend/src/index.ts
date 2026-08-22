/**
 * HTTP server bootstrap: env validation, DB connect, listen on configured host/port.
 *
 * Responsibility: process-level error hooks and start listening for the REST API.
 * Layer: backend process entry
 * Depends on: config, @project/db, @project/server-kit, ./app.js
 * Consumers: node dist/index.js
 */

import config from "config";
import http from "http";
import { connectDatabase, prisma } from "@project/db";
import { validateBackendProductionSecuritySettings } from "@project/server-kit/validateBackendSecurity";
import { app } from "./app.js";
import { logError, logInfo } from "./utils/logger.js";

process.on("unhandledRejection", (reason) => {
  logError("[APP]", reason, { type: "unhandledRejection" });
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logError("[APP]", error, { type: "uncaughtException" });
  process.exit(1);
});

validateBackendProductionSecuritySettings();

await connectDatabase();

const server = http.createServer(app);

const port = Number(config.get<number | string>("app.port"));
const host = config.get<string>("app.host");
server.listen(port, host, () => {
  logInfo("[APP]", "server-started", {
    port,
    host,
    localUrl: `http://localhost:${port}`,
  });
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
