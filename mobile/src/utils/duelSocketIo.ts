/** Duel Socket.IO client factory; inbound handlers live in `utils/duelInboundSocket`. */
import { io, type Socket } from "socket.io-client";
import { bindDuelSocketEvents } from "@/utils/duelInboundSocket";
import { duelConnectionRefs } from "@/utils/duelSocketModels";

export function connectDuelSocket(url: string, authToken: string | null): Socket {
  const tokenKey = authToken ?? "";
  if (duelConnectionRefs.socket && duelConnectionRefs.lastAuthTokenKey === tokenKey) return duelConnectionRefs.socket;
  if (duelConnectionRefs.socket) {
    duelConnectionRefs.socket.removeAllListeners();
    duelConnectionRefs.socket.disconnect();
  }
  duelConnectionRefs.lastAuthTokenKey = tokenKey;
  const socket = io(url, { transports: ["websocket"], auth: { token: tokenKey } });
  bindDuelSocketEvents(socket);
  duelConnectionRefs.socket = socket;
  return socket;
}
