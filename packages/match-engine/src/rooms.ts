/**
 * Game modes as configurations of one engine (PRD 11.4) and private-room codes (PRD 11.7).
 */

export const GAME_MODES = {
  ranked: { players: [2, 2], rounds: [5], rated: true, dailyXpCap: false },
  friends: { players: [2, 2], rounds: [5], rated: false, dailyXpCap: true },
  room: { players: [2, 4], rounds: [5, 7, 10], rated: false, dailyXpCap: true },
} as const;
export type GameMode = keyof typeof GAME_MODES;

/** 31 characters with no look-alikes: no 0, O, 1, I or L. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

/** A room code from `random` (values in [0, 1)); the server passes a cryptographic source. */
export function roomCode(random: () => number): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)]).join("");
}

export function isRoomCode(text: string): boolean {
  return text.length === ROOM_CODE_LENGTH && [...text].every((character) => ROOM_CODE_ALPHABET.includes(character));
}
