/**
 * The social API (PRD 11.1, 11.2, 15.7), shared by the backend and the app. Paths are relative to
 * `/api/social`. Every user other than the caller reaches the app only as a `PublicUser`, built
 * by one server function that applies blocks and privacy; an email is never part of it.
 */

export const PROFILE_VISIBILITIES = ["EVERYONE", "FRIENDS", "NOBODY"] as const;
export const FRIEND_REQUEST_POLICIES = ["EVERYONE", "CODE_ONLY"] as const;
export const PRESENCE_VISIBILITIES = ["FRIENDS", "NOBODY"] as const;
export const GAME_INVITE_POLICIES = ["FRIENDS", "NOBODY"] as const;
export const REPORT_TARGETS = ["USERNAME", "AVATAR", "BIO", "BEHAVIOUR"] as const;

/** How the caller relates to another user. */
export type Relationship = "friend" | "requestSent" | "requestReceived" | "none";

export type PublicUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  /** Null when the user's profile is hidden from the caller (friends and requests still list them). */
  level: number | null;
  /** Shown once the user has played enough ranked games to be placed; null before or when hidden. */
  rating: number | null;
  bio: string | null;
  relationship: Relationship;
};

/** `GET /search?q=` — up to 20 users whose username starts with `q` (3 characters at least). */
export type SearchResponse = { users: PublicUser[] };
export const SEARCH_MIN_LENGTH = 3;
export const SEARCH_MAX_RESULTS = 20;

/** `GET /friends` — friends, and the requests waiting on either side. */
export type FriendRequest = { id: string; user: PublicUser; createdAt: string };
export type FriendsResponse = { friends: PublicUser[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; friendCode: string };
export const MAX_OUTGOING_REQUESTS = 20;
export const MAX_FRIENDS = 200;
/** After a decline the sender waits this long before asking the same user again (PRD 11.1). */
export const DECLINE_COOLDOWN_DAYS = 30;

/** `POST /friends/requests` — by username, or by friend code (needed when the user takes requests only by code). */
export type SendFriendRequest = { username?: string; friendCode?: string };

/** `GET` and `PATCH /privacy`. */
export type PrivacySettings = {
  profileVisibility: (typeof PROFILE_VISIBILITIES)[number];
  friendRequestPolicy: (typeof FRIEND_REQUEST_POLICIES)[number];
  searchable: boolean;
  presenceVisibility: (typeof PRESENCE_VISIBILITIES)[number];
  gameInvitePolicy: (typeof GAME_INVITE_POLICIES)[number];
};

/** `POST /reports` — goes to the manual review queue (PRD 11.2). */
export type ReportRequest = { userId: string; target: (typeof REPORT_TARGETS)[number]; reason: string };

/**
 * Error replies of the social API. A block and a missing user read the same, so a reply never
 * reveals that someone blocked the caller; a decline is never reported to its sender (PRD 11.1).
 */
export const SOCIAL_ERRORS = {
  userNotFound: "User not found",
  cannotAddSelf: "You cannot add yourself",
  codeOnly: "This user accepts friend requests only by friend code",
  alreadyFriends: "You are already friends",
  tooManyRequests: "Too many pending friend requests",
  friendLimit: "Friend limit reached",
  requestNotFound: "Friend request not found",
} as const;
