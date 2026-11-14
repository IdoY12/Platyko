import { z } from "zod";
import { FRIEND_REQUEST_POLICIES, GAME_INVITE_POLICIES, PRESENCE_VISIBILITIES, PROFILE_VISIBILITIES, REPORT_TARGETS, SEARCH_MIN_LENGTH } from "@project/api-contract";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";
import { USERNAME_MAX_LEN } from "@project/user-credentials";

const userId = z.string().min(1).max(64).regex(/^[a-z0-9]+$/);

export const searchQuerySchema = z.object({ q: z.string().trim().min(SEARCH_MIN_LENGTH).max(USERNAME_MAX_LEN) });
export const usernameParamsSchema = z.object({ username: z.string().min(1).max(USERNAME_MAX_LEN) });
export const userIdParamsSchema = z.object({ userId });
export const requestIdParamsSchema = z.object({ requestId: userId });

export const sendFriendRequestSchema = z
  .object({ username: z.string().min(1).max(USERNAME_MAX_LEN).optional(), friendCode: z.string().regex(/^[A-Za-z2-9]{8}$/).optional() })
  .refine((body) => Boolean(body.username) !== Boolean(body.friendCode), { message: "Give a username or a friend code" });

export const blockBodySchema = z.object({ userId });
export const friendsQuerySchema = z.object({ localDate: z.string().regex(CALENDAR_DATE_PATTERN).optional() });
export const friendStreakBodySchema = z.object({ enabled: z.boolean() });

export const reportBodySchema = z.object({ userId, target: z.enum(REPORT_TARGETS), reason: z.string().trim().min(3).max(500) });

export const privacyBodySchema = z
  .object({
    profileVisibility: z.enum(PROFILE_VISIBILITIES),
    friendRequestPolicy: z.enum(FRIEND_REQUEST_POLICIES),
    searchable: z.boolean(),
    presenceVisibility: z.enum(PRESENCE_VISIBILITIES),
    gameInvitePolicy: z.enum(GAME_INVITE_POLICIES),
    readmeBadgeEnabled: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one setting is required" });
