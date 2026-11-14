# Platyko launch handoff (written 2026-11-07, end of day)

Read this first in the next session. Full history also lives in Claude's memory (/areas/platyko.md).

## Where things stand
- Code: VS Code `/goal` agent finished; 45 commits pushed, gates green. Not yet done: content
  correctness audit, App Store guideline audit, report/block users, username/avatar filtering,
  Apple token revoke + server-to-server notifications, Sentry, iPad disable. All of these are
  specified in AGENT_TASKS.md.
- Infra (AWS, us-east-1): EC2 platyko-server prepared (Docker 29 + Compose v5, AWS CLI), access
  ONLY via Session Manager (port 22 closed), IMDS hop limit 2, role platyko-server-role
  (S3 inline policy + AmazonSSMManagedInstanceCore). S3: platyko-avatars, platyko-backups
  (7-day lifecycle), platyko-site (static site behind CloudFront EGM18RJOQB2E8).
- NOT deployed yet: backend / io / Postgres containers have never been started on the server.
- Site: platyko.com privacy/terms/help now show support@platyko.com (repo platyko_privacy).
- Email: support@platyko.com forwards (ImprovMX) to idoyahav15@gmail.com + platyko.js@gmail.com.
  Resend DNS is in place; a NEW production API key + webhook secret still have to be created.
- Uncommitted in this repo: DEPLOY.md (rewritten), infra/backup/pg-backup.sh (prune removed),
  .env.example (region/bucket/email fixed), AGENT_TASKS.md, HANDOFF.md. The agent commits them.

## Exact next steps, in order
1. In VS Code Claude Code: `Read AGENT_TASKS.md and execute it fully.`
2. Confirm in GitHub that the push "up to commit 4c21bd9" during the paused run was yours.
3. Resend dashboard: create production API key (re_...) and the webhook
   https://api.platyko.com/api/webhooks/resend (email.bounced, email.complained) -> whsec_...
4. After the agent finishes and pushes: EC2 -> Instances -> platyko-server -> Connect ->
   Session Manager -> `sudo -iu ubuntu`, then follow DEPLOY.md sections 2-3 (clone, .env.production,
   migrate, seed, up, health checks). Paste the Resend values yourself; JWT/Postgres secrets come
   from `openssl rand -hex`.
5. Post-deploy: api/io health over HTTPS, signup email arrives, avatar upload works, then delete
   the IAM user platyko-backend's access key (and the user) once the role path is proven.
6. Then: Sentry DSN, EAS/iPhone build, Apple Sign In + push test on a real iPhone, App Store
   Connect (privacy labels, new age-rating questionnaire, EU DSA trader status using
   support@platyko.com, demo account for review, screenshots), submit.

## Decisions already made (don't re-ask)
- iOS only for launch. iPad support off. Keep Session Manager, never reopen SSH to the world.
- Secrets are never typed by Claude; Ido pastes them. Deploy only when Ido is at the computer.
- Privacy policy "7 days" refers to backups only; user data is not auto-deleted.
