You are performing a deep, strict, uncompromising code review of the Platybit monorepo.

**CRITICAL RULE: Do NOT modify any code. Do NOT suggest refactors. Only produce a written report.**

Your job is to act as a senior engineer doing a pre-production audit. Be harsh. Be thorough. Do not give the benefit of the doubt. If something looks suspicious, flag it.

---

## SCOPE OF REVIEW

Audit all layers of the monorepo:
- mobile/ — React Native / Expo app
- backend/ — Express / Prisma API server
- socket-service/ — Socket.io real-time duel service
- shared/ — shared packages and types

---

## WHAT TO CHECK

### 1. Dead Code & Unreachable Code
- Files that are never imported anywhere
- Exported functions/types/constants that have zero consumers
- Commented-out code blocks that were left in
- TODO/FIXME/HACK comments — list every single one
- Unreachable branches (code after return, impossible conditions)

### 2. Bugs & Logic Errors
- Race conditions (especially in Socket.io duel logic)
- Missing awaits on async calls
- Unhandled Promise rejections
- Incorrect error handling (catch blocks that swallow errors silently)
- Edge cases that are not handled (empty arrays, null/undefined, zero values)
- Any place where the app could crash silently

### 3. Security
- Hardcoded secrets, API keys, tokens, or passwords anywhere in the codebase (including .env.example)
- Missing input validation or sanitization on any API route
- Routes that are missing authentication middleware that should require it
- SQL injection or Prisma raw query risks
- CORS configuration — is it too permissive?
- Rate limiting — which routes have it, which are exposed without it?
- JWT handling — are tokens verified correctly, are expiry checks enforced?
- Any place where user-controlled data reaches a dangerous operation without validation

### 4. Performance & Stability
- N+1 query patterns in Prisma (loops that trigger individual DB calls)
- Missing database indexes for frequently queried fields
- Memory leaks — event listeners or intervals that are never cleaned up
- Socket.io rooms or connections that are never properly closed
- Any synchronous blocking operations in Express route handlers

### 5. Production Readiness
- Are all console.log / console.error statements appropriate, or are there debug logs that should be removed?
- Are error responses leaking internal stack traces or sensitive info to the client?
- Are environment variables properly validated at startup (will the app fail fast if a required env var is missing)?
- Is there proper graceful shutdown handling?
- Are there any hardcoded development URLs, localhost references, or test data left in production code paths?

---

## OUTPUT FORMAT

Produce a structured report with the following sections:

### 🔴 Critical Issues (must fix before production)
### 🟡 Warnings (should fix, risk if ignored)
### 🟢 Minor / Code Quality (nice to fix)
### 📋 Dead Code Inventory (files, exports, comments)
### ✅ What looks solid

For every issue, include:
- File path + line number
- What the problem is
- Why it's a risk

Be specific. No vague statements like "consider improving error handling." Point to the exact location.

---

Again: read-only audit. Zero code changes. Deliver only the report.