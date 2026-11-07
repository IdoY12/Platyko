/** Duel Socket.IO client factory; inbound handlers live in `utils/duelInboundSocket`. */
import { io, type Socket } from "socket.io-client";
import { bindDuelSocketEvents } from "@/utils/duelInboundSocket";
import { duelConnectionRefs } from "@/utils/duelSocketModels";
import store from "@/redux/store";

/** One socket per signed-in user; it reads the current token on every (re)connect, so rotations need no new socket. */
export function connectDuelSocket(url: string): Socket {
  if (duelConnectionRefs.socket) return duelConnectionRefs.socket;
  // Read on every (re)connect, so a reconnect after a token rotation never presents an expired token.
  const socket = io(url, { transports: ["websocket"], auth: (cb) => cb({ token: store.getState().session.accessToken ?? "" }) });
  bindDuelSocketEvents(socket);
  duelConnectionRefs.socket = socket;
  return socket;
}
