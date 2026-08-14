# Platyko

![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

**Platyko** is a mobile app for deliberate daily JavaScript practice. Developers at Junior, Mid, or Senior level follow a structured curriculum, keep a daily streak, and battle each other in real-time 1v1 duels.

The core loop: **learn → streak → duel.**

This repository is an npm-workspaces monorepo containing the Expo/React Native mobile app, an Express REST API, a Socket.IO real-time service for duels, and a set of shared TypeScript packages (database client, JWT helpers, game constants, and pure domain logic) that keep all three runtimes in sync.

## Features

- **Onboarding wizard** — 3-step level / goal / commitment picker on first launch (AsyncStorage-gated).
- **Learn** — 3 curriculum blocks per level (9 total), each with 10 exercises mixing multiple-choice and short-answer puzzle types. Progress is server-synced for registered users and stored locally for guests.
- **Duel Mode** — real-time 1v1 Socket.IO battles over 5 rounds, for authenticated users only. Solo auto-match kicks in after 25 s with no opponent; each round allows up to 3 wrong attempts. Includes post-match replay and rematch.
- **Code Puzzle** — standalone free-response puzzles evaluated against accepted answers or test cases inside an `isolated-vm` V8 sandbox (32 MB / 100 ms limits). XP is capped at 10 solves per puzzle.
- **XP & Level** — 250 XP per correct answer across lessons, puzzles, and duel rounds; `level = floor(xp / 250) + 1`.
- **Streak** — increments once per calendar day on qualifying XP, resets after 2+ missed days. The same pure logic runs on backend, io, and mobile.
- **Daily Goal** — a user-chosen commitment (10 / 15 / 25 min) with server-side practice-time tracking and a daily push notification at 19:00 via `expo-notifications`.
- **Accounts & auth** — email + password registration with OTP email verification (AWS SES), Google Sign-In, JWT access/refresh tokens, password change, and account deletion.
- **Profile** — avatar upload to S3, username, and preference management.
- **Guest mode** — full Learn and Code Puzzle access without an account; XP and streak are kept locally. Registering unlocks Duel Mode and server sync.
