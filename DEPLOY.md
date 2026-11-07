# Deploying Platyko to production

Target: one Linux host with Docker Engine 24+ and Compose v2, public DNS `api.platyko.com` and
`io.platyko.com` pointing at it, ports 80/443 open. Everything below runs from a clean `git clone`;
nothing depends on files that only exist on a developer machine.

## 0. The server

| | |
|---|---|
| Provider / region | AWS EC2, `us-east-1` |
| Elastic IP | `3.218.198.166` (A records for `api.platyko.com` and `io.platyko.com`) |
| OS user | `ubuntu` (member of the `docker` group) |
| Repo checkout | `/home/ubuntu/Platyko` |
| SSH | `ssh -i <path-to-your-key>.pem ubuntu@3.218.198.166` |
| Instance role | needs the S3 backup permissions in section 5 (and the avatar bucket permissions if `AWS_*` keys are left empty) |

The private key never lives in this repository. Host packages required once:
`docker`, `docker-compose-plugin`, `awscli`, `git`.

## 1. First deploy

```bash
git clone https://github.com/IdoY12/Platyko.git && cd Platyko

# Secrets: fill every PRODUCTION value (see the comments in .env.example).
cp .env.example .env.production
$EDITOR .env.production            # openssl rand -hex 32 for each JWT secret, -hex 24 for Postgres

# Build both images and start Postgres, backend, io and Caddy.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# Pre-flight on an EXISTING database (skip on a fresh one): 20261106000000 lower-cases every email and
# aborts if two rows differ only by case/whitespace. Both queries must return no rows; merge any first.
#   SELECT lower(trim(email)), count(*) FROM "User" GROUP BY 1 HAVING count(*) > 1;
#   SELECT lower(trim(email)), count(*) FROM "PendingRegistration" GROUP BY 1 HAVING count(*) > 1;
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
from the nightly S3 backup, or from an ad-hoc dump taken right before the release:

```bash
# before a release that adds a migration, take an extra dump:
/home/ubuntu/Platyko/infra/backup/pg-backup.sh
```

Restore steps are in section 5.

## 4. Operating

```bash
docker compose -f docker-compose.prod.yml logs -f backend io        # structured lines, [rid=<X-Request-Id>]
docker compose -f docker-compose.prod.yml ps                        # health of every service
```

Every 5xx the API returns carries `requestId`; grep the backend log for `rid=<that id>` to see the stack.
Container logs rotate at 10 MB × 5 files per service. Postgres data lives in the `pgdata` volume;
Caddy certificates in `caddy_data`. Both survive `docker compose down` (not `down -v`).

## 5. Backups (daily, S3, 7-day retention)

`infra/backup/pg-backup.sh` runs `pg_dump -Fc` inside the postgres container, uploads it to
`s3://platyko-backups/<hostname>/platyko-<UTC timestamp>.dump` (bucket in `us-east-1`) and deletes
copies older than 7 days. Credentials come from the instance role; nothing is stored on the host.

### Install the cron job (once)

```bash
sudo cp /home/ubuntu/Platyko/infra/backup/platyko-backup.cron /etc/cron.d/platyko-backup
sudo chmod 644 /etc/cron.d/platyko-backup
sudo touch /var/log/platyko-backup.log && sudo chown ubuntu /var/log/platyko-backup.log
/home/ubuntu/Platyko/infra/backup/pg-backup.sh          # run once by hand to confirm
aws s3 ls s3://platyko-backups/$(hostname)/               # the dump is listed
```

The job fires at 03:15 UTC daily and logs to `/var/log/platyko-backup.log`.

### IAM policy for the EC2 instance role

Attach this policy to the role the instance runs under (replace nothing; the bucket name is fixed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::platyko-backups" },
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::platyko-backups/*" }
  ]
}
```

Bucket settings: block all public access, default SSE-S3 encryption, versioning optional. The script
already prunes by age; an S3 lifecycle rule expiring objects after 8 days is a cheap belt-and-braces.

### Restore

```bash
# 1. pick the dump
aws s3 ls s3://platyko-backups/$(hostname)/
aws s3 cp s3://platyko-backups/$(hostname)/platyko-YYYY-MM-DDTHHMMSSZ.dump /tmp/restore.dump

# 2. stop the apps so nothing writes during the restore (Postgres keeps running)
cd /home/ubuntu/Platyko
docker compose --env-file .env.production -f docker-compose.prod.yml stop backend io

# 3. restore in place (--clean drops and recreates every object in the dump)
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U platyko -d platyko --clean --if-exists --no-owner < /tmp/restore.dump

# 4. bring the apps back and verify
docker compose --env-file .env.production -f docker-compose.prod.yml start backend io
curl -fsS https://api.platyko.com/health
rm /tmp/restore.dump
```

If the dump predates a migration that is now in the code, run the `migrate` service again after
step 3 so the schema catches up before the apps start.

## 6. Rotating a secret

1. Edit `.env.production`.
2. `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` (recreates only the
   services whose environment changed).
3. Rotating `JWT_*` signs every user out; rotating `RESEND_WEBHOOK_SECRET` also requires updating the
   endpoint in the Resend dashboard.
