/**
 * Game modes as configurations of one engine (PRD 11.4) and private-room codes (PRD 11.7).
 */
export declare const GAME_MODES: {
    readonly ranked: {
        readonly players: readonly [2, 2];
        readonly rounds: readonly [5];
        readonly rated: true;
        readonly dailyXpCap: false;
    };
    readonly friends: {
        readonly players: readonly [2, 2];
        readonly rounds: readonly [5];
        readonly rated: false;
        readonly dailyXpCap: true;
    };
    readonly room: {
        readonly players: readonly [2, 4];
        readonly rounds: readonly [5, 7, 10];
        readonly rated: false;
        readonly dailyXpCap: true;
    };
};
export type GameMode = keyof typeof GAME_MODES;
/** Unrated games that earn XP each day (PRD 11.4): a cap against farming between two accounts. */
export declare const UNRATED_XP_GAMES_PER_DAY = 5;
/** 31 characters with no look-alikes: no 0, O, 1, I or L. */
export declare const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export declare const ROOM_CODE_LENGTH = 6;
/** A room code from `random` (values in [0, 1)); the server passes a cryptographic source. */
export declare function roomCode(random: () => number): string;
export declare function isRoomCode(text: string): boolean;
//# sourceMappingURL=rooms.d.ts.map