import { isRoomCode, ROOM_CODE_ALPHABET } from "@project/match-engine";

/**
 * Shareable links (PRD 11.1, 11.7): `https://platyko.com/r/<room code>` opens a room's lobby and
 * `https://platyko.com/f/<friend code>` a friend request. The app's own scheme carries the same
 * paths (`com.idoyahav.platyko://r/<code>`), for when the website is not involved.
 */
export const LINK_ORIGIN = "https://platyko.com";
const FRIEND_CODE_LENGTH = 8;

export type AppLink = { kind: "room" | "friend"; code: string };

export const roomLink = (code: string) => `${LINK_ORIGIN}/r/${code}`;
export const friendLink = (code: string) => `${LINK_ORIGIN}/f/${code}`;

const isFriendCode = (code: string) => code.length === FRIEND_CODE_LENGTH && [...code].every((character) => ROOM_CODE_ALPHABET.includes(character));

/** The room or friend code a link carries, or null for any other link. */
export function parseAppLink(url: string): AppLink | null {
  const match = /(?:platyko\.com\/|:\/\/)(r|f)\/([A-Za-z0-9]+)\/?(?:[?#]|$)/.exec(url);
  if (!match) return null;
  const code = match[2].toUpperCase();
  if (match[1] === "r") return isRoomCode(code) ? { kind: "room", code } : null;
  return isFriendCode(code) ? { kind: "friend", code } : null;
}
