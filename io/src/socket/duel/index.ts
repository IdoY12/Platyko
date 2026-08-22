import type { Server } from "socket.io";
import { logInfo } from "../../utils/logger.js";
import type { DuelNamespace, DuelSocket } from "./types.js";
import { attachDuelConnectionAuthentication } from "./middleware/attachDuelConnectionAuthentication.js";
import { registerDisconnect } from "./handlers/disconnect.js";
import { registerJoinQueue } from "./handlers/joinQueue.js";
import { registerLeaveQueue } from "./handlers/leaveQueue.js";
import { registerPlayerReady } from "./handlers/playerReady.js";
import { registerRematchAbandoned, registerRematchRequest } from "./handlers/rematchRequest.js";
import { registerSubmitAnswer } from "./handlers/submitAnswer.js";
import { syncActiveDuelOnConnect } from "./syncActiveDuelOnConnect.js";
import { broadcastQueueStatus } from "./state.js";

export function attachDuelNamespace(io: Server) {
  const duel: DuelNamespace = io.of("/duel");
  attachDuelConnectionAuthentication(duel);
  duel.on("connection", (socket: DuelSocket) => {
    logInfo("[DUEL]", "socket:connected", { socketId: socket.id });
    if (socket.data.authenticatedUserId) {
      broadcastQueueStatus(duel);
      void syncActiveDuelOnConnect(socket);
    }
    registerJoinQueue(socket, duel);
    registerLeaveQueue(socket, duel);
    registerPlayerReady(socket, duel);
    registerSubmitAnswer(socket, duel);
    registerRematchRequest(socket, duel);
    registerRematchAbandoned(socket, duel);
    registerDisconnect(socket, duel);
  });
}
