/** Duel Socket.IO client factory; inbound handlers live in `utils/duelInboundSocket`. */
import { io, type Socket } from "socket.io-client";
import { bindDuelSocketEvents } from "@/utils/duelInboundSocket";
import { duelConnectionRefs } from "@/utils/duelSocketModels";
import store from "@/redux/store";

export function connectDuelSocket(url: string, authToken: string | null): Socket {
  const tokenKey = authToken ?? "";
  if (duelConnectionRefs.socket && duelConnectionRefs.lastAuthTokenKey === tokenKey) return duelConnectionRefs.socket;
  if (duelConnectionRefs.socket) {
    duelConnectionRefs.socket.removeAllListeners();
    duelConnectionRefs.socket.disconnect();
  }
  duelConnectionRefs.lastAuthTokenKey = tokenKey;
  // Read on every (re)connect, so a reconnect after a token rotation never presents an expired token.
  const socket = io(url, { transports: ["websocket"], auth: (cb) => cb({ token: store.getState().session.accessToken ?? "" }) });
  bindDuelSocketEvents(socket);
  duelConnectionRefs.socket = socket;
  return socket;
}
