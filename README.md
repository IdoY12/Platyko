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
