# Deploying Platyko to production

Target: one Linux host (arm64 or x86_64) with Docker Engine 24+ and Compose v2, public DNS
`api.platyko.com` and `io.platyko.com` pointing at it, ports 80/443 open. Everything below runs
from a clean `git clone`; nothing depends on files that only exist on a developer machine.

## 1. First deploy

```bash
git clone https://github.com/IdoY12/Platyko.git && cd Platyko

# Secrets: fill every PRODUCTION value (see the comments in .env.example).
cp .env.example .env.production
$EDITOR .env.production            # openssl rand -hex 32 for each JWT secret, -hex 24 for Postgres

# Build both images and start Postgres, backend, io and Caddy.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Apply schema migrations (explicit step — containers never migrate on start).
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate

# Seed curriculum, duel questions and code puzzles (idempotent upserts; safe to re-run).
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate \
  npm --prefix backend run prisma:seed

# Restart the API so it sees the migrated schema, then check health.
docker compose --env-file .env.production -f docker-compose.prod.yml restart backend io
curl -fsS https://api.platyko.com/health && curl -fsS https://io.platyko.com/health
```

Caddy obtains the certificates on first request; DNS must resolve before `up`.

### Outside the repo (one-time)

- **Resend**: verify the `platyko.com` sending domain; create the API key; add the webhook
  `https://api.platyko.com/api/webhooks/resend` for `email.bounced` and `email.complained`.
- **S3**: create the avatar bucket. Objects under `avatars/` must be publicly readable (the app loads
  them by URL); everything else private. Either an IAM role on the host or the `AWS_*` keys.
- **Apple / Google**: the bundle id `com.idoyahav.platyko` and the Google client ids in
  `backend/config/default.json` must match the App Store / Google Cloud console entries.

## 2. Releasing a new version

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate   # only if a migration was added
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps                                            # all "healthy"
```

Compose replaces backend and io one after the other; in-flight duels on the io container are lost
(state is in memory by design), so release when duel traffic is lowest.

## 3. Rollback

```bash
git log --oneline -5                       # find the last good commit
git checkout <good-commit>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Migrations are forward-only. If a release added a migration that must be undone, restore the database
from the snapshot taken before the release:

```bash
# before every release with a migration:
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U platyko -Fc platyko > backup-$(date +%F).dump
# to restore:
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U platyko -d platyko --clean < backup-YYYY-MM-DD.dump
```

## 4. Operating

```bash
docker compose -f docker-compose.prod.yml logs -f backend io        # structured lines, [rid=<X-Request-Id>]
docker compose -f docker-compose.prod.yml ps                        # health of every service
```

Every 5xx the API returns carries `requestId`; grep the backend log for `rid=<that id>` to see the stack.
Container logs rotate at 10 MB × 5 files per service. Postgres data lives in the `pgdata` volume;
Caddy certificates in `caddy_data`. Both survive `docker compose down` (not `down -v`).

## 5. Rotating a secret

1. Edit `.env.production`.
2. `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` (recreates only the
   services whose environment changed).
3. Rotating `JWT_*` signs every user out; rotating `RESEND_WEBHOOK_SECRET` also requires updating the
   endpoint in the Resend dashboard.
