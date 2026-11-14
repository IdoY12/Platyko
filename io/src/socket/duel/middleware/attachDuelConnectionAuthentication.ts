import { attachSocketAuthentication } from "../../authenticateSocket.js";
import type { DuelNamespace } from "../types.js";

export function attachDuelConnectionAuthentication(duelNamespace: DuelNamespace): void {
  attachSocketAuthentication(duelNamespace as never, "[DUEL]");
}
