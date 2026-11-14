# Agent task: pre-launch audits and fixes (read this file fully, then execute)

Decide on your own; do not ask me questions. Keep all gates green (typecheck, lint, knip, tests).
Commit in small logical commits and push. End with a short report: what you changed, what you
verified by running it, and any decision that only the owner can make.

## 0. Already changed in the working tree by someone else (uncommitted)
`DEPLOY.md` (rewritten), `infra/backup/pg-backup.sh` (prune loop removed on purpose: the EC2 role is
write-only for backups, retention is an S3 lifecycle rule) and `.env.example` (region us-east-1,
bucket platyko-avatars, Caddy email). Review them against the real code (Dockerfiles, compose,
Caddyfile, config/*.json, validateBackendSecurity, seed entrypoint). Correct anything inaccurate,
especially the seed command and the container-reaches-IMDS check, then commit them.

## A. Content correctness audit
Verify every learner-facing item for logical and factual correctness and that nothing misleads users:
- All curriculum lessons and quiz questions: exactly one correct answer, correct option marked
  correctly, no ambiguous wording, no duplicate or near-duplicate options, explanations match the answer.
- All code puzzles: run each reference solution and its test cases in the real sandbox; confirm hidden
  tests match the task description and that no trivially wrong answer passes or correct answer fails.
- All live 1v1 duel questions: same checks, plus confirm scoring and timing cannot be gamed and the
  correct answer is never sent to the client before submission.
Output a table (item id, problem, fix). Fix the seed data and re-run the seed idempotently.

## B. App Store Review Guidelines audit (use the current official guidelines)
Check: 1.2 user-generated content (usernames, avatars, duel interactions), 2.1 completeness and
demo account, 2.3 accurate metadata, 4.0 and 4.8 login services, 5.1.1 privacy, data collection and
account deletion, 5.1.2 data use, PrivacyInfo.xcprivacy accuracy, age rating questionnaire answers.
Known gaps (verified by grep: none of this exists yet) - implement them:
1. No report/block mechanism. Add report + block users (backend endpoints, DB model + migration,
   mobile UI in duel/profile screens), reports stored for admin review, and in-app support contact
   support@platyko.com.
2. No content filter for usernames or avatars. Add a username filter and an avatar report path.
3. Sign in with Apple: on account deletion call POST https://appleid.apple.com/auth/revoke for the
   stored token; add the server-to-server notification endpoint (consent-revoked, account-deleted,
   email-enabled, email-disabled) validating the JWS signature against Apple's keys; confirm the
   in-app delete flow erases all personal data (including S3 avatar, and handles duel history
   references) and tells the user what is retained.
4. Terms must state zero tolerance for objectionable content and the user must accept before use.
5. Disable iPad support (supportsTablet false in mobile/app.json and the iOS project settings).
6. Add Sentry crash reporting for the mobile app and the backend/io (DSN from env, no PII).
7. Draft App Store privacy labels and age-rating questionnaire answers from the real code, in a
   file docs/app-store-submission.md, together with a demo-account plan for App Review.
