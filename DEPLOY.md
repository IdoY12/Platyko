# Deploying Platyko to production

Single-host deployment: one EC2 instance runs Docker Compose (Caddy, backend, io, Postgres).
Everything below runs from a clean `git clone`. Statements marked **[verify on first deploy]** could
not be tested before the first real deploy; check them and fix this file if they differ.

## 0. What exists today (verified in the AWS console)

| Item | Value |
|---|---|
| Instance | `i-020926606e38aef25` (`platyko-server`), `t4g.small` (arm64), Ubuntu 26.04, `us-east-1` |
| Public IP | Elastic IP `3.218.198.166` |
| DNS (Hostinger) | `api` and `io` A records -> `3.218.198.166`; `platyko.com` and `www` -> CloudFront (static site, S3 bucket `platyko-site`); MX/SPF -> ImprovMX (`support@platyko.com` forwarding); Resend DKIM/SPF records under `resend._domainkey`, `send`, `rsend` |
| Security group | only 80 and 443 open; **port 22 is closed** (no SSH at all) |
| Instance role | `platyko-server-role`: inline policy `PlatykoServerS3Access` (section 7) + AWS managed `AmazonSSMManagedInstanceCore` (Session Manager) |
| Instance metadata | IMDSv2 required, hop limit 2 (needed so containers can reach the role credentials) |
| S3 buckets | `platyko-avatars` (user avatars), `platyko-backups` (nightly dumps), `platyko-site` (static website) |

No access keys are used on the server: the backend gets S3 access from the instance role. Leave
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty in `.env.production`.

## 1. Getting a shell on the server (no SSH)

Access is through AWS Systems Manager Session Manager: no open port, no key file, controlled by
your AWS console login (password + MFA) and logged in CloudTrail.

- Console: EC2 -> Instances -> `platyko-server` -> **Connect** -> **Session Manager** -> Connect.
- CLI (from CloudShell or a laptop with the Session Manager plugin):
  `aws ssm start-session --target i-020926606e38aef25 --region us-east-1`
- A session starts as `ssm-user` (has sudo). Switch to the deploy user first: `sudo -iu ubuntu`.
- Non-interactive commands can also be sent with `aws ssm send-command --document-name AWS-RunShellScript`.

If Session Manager ever stops working (agent down), do not reopen port 22 to the world; add a
temporary `/32` rule for your IP in the security group, fix the agent, then remove the rule.

### One-time host setup (already done on 2026-11-07)

Docker Engine 29 + Compose v5 (official Docker apt repo, arm64), git and the AWS CLI (snap) are
installed, `ubuntu` is in the `docker` group, `hello-world` ran, `aws sts get-caller-identity`
returned the instance role, and a container could reach IMDSv2 (hop limit 2 verified). Note:
the stock Ubuntu `docker-compose-v2` package conflicts with Docker's `docker-compose-plugin` and had
to be removed first. To rebuild the host from scratch, run:

```bash
# Docker Engine + Compose v2 from Docker's official apt repository
sudo apt update && sudo apt install -y ca-certificates curl git
sudo apt remove -y docker-compose-v2 docker.io    # Ubuntu's packages conflict with Docker's repo
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources <<EOT
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOT
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu && newgrp docker
docker run --rm hello-world

# AWS CLI (used only by the backup script)
sudo snap install aws-cli --classic
aws sts get-caller-identity                       # must show the assumed role platyko-server-role
```

Confirm containers can reach the role credentials (this is what the IMDS hop limit 2 is for):

```bash
docker run --rm curlimages/curl -s -o /dev/null -w "%{http_code}\n" -X PUT \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" http://169.254.169.254/latest/api/token
# expected: 200   (000 or a timeout means the hop limit is still 1)
```

## 2. Secrets (`.env.production`)

```bash
git clone https://github.com/IdoY12/Platyko.git && cd Platyko
cp .env.example .env.production && chmod 600 .env.production
openssl rand -hex 32   # run twice: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (must differ)
openssl rand -hex 24   # POSTGRES_PASSWORD
```

Values to set (uncomment and fill; the backend refuses to boot on placeholders or short secrets):

| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | random, from above |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different random 64-hex strings |
| `CORS_ORIGIN`, `IO_CORS_ORIGIN` | `https://platyko.com` (native app requests send no Origin) |
| `RESEND_API_KEY` | new production key from the Resend dashboard (starts with `re_`) |
| `RESEND_WEBHOOK_SECRET` | signing secret of the webhook below (starts with `whsec_`) |
| `S3_BUCKET` | `platyko-avatars` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | leave empty (instance role) |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` | optional; defaults ship in `backend/config/default.json` |
| `CADDY_ACME_EMAIL` | `support@platyko.com` |

Resend (dashboard, one time): the sending domain `platyko.com` must show as verified; create the API
key; add a webhook to `https://api.platyko.com/api/webhooks/resend` for `email.bounced` and
`email.complained` and copy its signing secret. Never reuse keys that were ever pasted into chat,
tickets or commits.

## 3. First deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build postgres
# Existing database only (skip on a fresh one): both queries must return no rows before migrating.
#   SELECT lower(trim(email)), count(*) FROM "User" GROUP BY 1 HAVING count(*) > 1;
#   SELECT lower(trim(email)), count(*) FROM "PendingRegistration" GROUP BY 1 HAVING count(*) > 1;
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate \
  npm --prefix backend run prisma:seed                 # idempotent upserts   [verify on first deploy]
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps   # all "healthy"
curl -fsS https://api.platyko.com/health && curl -fsS https://io.platyko.com/health
```

Caddy requests the certificates on first start; DNS for `api` and `io` must already resolve to the
Elastic IP (it does) and ports 80/443 must be reachable. Migrations never run on container start.

Post-deploy checks:
1. `docker compose ... logs backend | tail` shows no boot-gate errors.
2. From a laptop: `curl -I https://api.platyko.com/health` returns 200 with a valid certificate.
3. Register a test account in the app: the verification email arrives (Resend) and an avatar upload
   works (S3 through the role). If the upload fails with a credentials error, recheck section 1 (IMDS).
4. Send a message to `support@platyko.com` and confirm it reaches the forwarding inboxes.

## 4. Releasing a new version

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate   # only if a migration was added
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

In-flight duels live in the io container's memory and are lost on restart: release at low traffic.
Take an extra dump before a release that adds a migration: `infra/backup/pg-backup.sh`.

## 5. Rollback

```bash
git log --oneline -5 && git checkout <good-commit>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Migrations are forward-only. To undo one, restore the database from a dump (section 7).

## 6. Operating

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend io
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Every 5xx response carries `requestId`; search the backend log for `rid=<id>`. Logs rotate at
10 MB x 5 files per service. Data lives in the `pgdata` volume and Caddy certificates in
`caddy_data`; both survive `docker compose down` (never use `down -v`). Rotating `JWT_*` secrets signs
every user out; rotating `RESEND_WEBHOOK_SECRET` also needs the new value in the Resend webhook.

## 7. Backups and IAM

The instance role is deliberately **write-only** for backups: a compromised server cannot read or
delete old dumps. Policy `PlatykoServerS3Access` on `platyko-server-role`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "AvatarsReadWrite", "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::platyko-avatars/*" },
    { "Sid": "AvatarsList", "Effect": "Allow", "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::platyko-avatars" },
    { "Sid": "BackupsWriteOnly", "Effect": "Allow", "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::platyko-backups/*" }
  ]
}
```

`infra/backup/pg-backup.sh` runs `pg_dump -Fc` in the postgres container and uploads it to
`s3://platyko-backups/<hostname>/platyko-<UTC timestamp>.dump`. It does not delete anything: the
7-day retention is an S3 lifecycle rule on `platyko-backups` (S3 console -> bucket -> Management ->
Lifecycle rules; confirm the rule exists and is enabled). Bucket must keep Block Public Access on
and SSE-S3 encryption.

Install the nightly job once:

```bash
sudo cp infra/backup/platyko-backup.cron /etc/cron.d/platyko-backup && sudo chmod 644 /etc/cron.d/platyko-backup
sudo touch /var/log/platyko-backup.log && sudo chown ubuntu /var/log/platyko-backup.log
infra/backup/pg-backup.sh                      # run once by hand
```

Then confirm the object exists from your own AWS console session (S3 -> `platyko-backups`) or
CloudShell: `aws s3 ls s3://platyko-backups/ --recursive`. Check `/var/log/platyko-backup.log` after
the first night.

### Restore

The server role cannot read backups. To restore: in the AWS console temporarily add `s3:GetObject`
on `arn:aws:s3:::platyko-backups/*` to the role policy, then on the server:

```bash
aws s3 cp s3://platyko-backups/<hostname>/platyko-<timestamp>.dump /tmp/restore.dump
docker compose --env-file .env.production -f docker-compose.prod.yml stop backend io
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U platyko -d platyko --clean --if-exists --no-owner < /tmp/restore.dump
docker compose --env-file .env.production -f docker-compose.prod.yml start backend io
curl -fsS https://api.platyko.com/health && rm /tmp/restore.dump
```

Remove the temporary `s3:GetObject` permission afterwards. If the dump predates a migration, run the
`migrate` service again before starting the apps. Test a restore on a scratch database before launch.

## 8. Still open (not covered by this file)

- Session Manager preferences (Systems Manager -> Session Manager -> Preferences) still use defaults:
  consider enabling session logging to CloudWatch Logs and a shorter idle timeout.
- No uptime or error alerting yet (add Sentry in the apps and an external uptime check on `/health`).
- The avatar bucket policy (public read only under `avatars/`) and CORS must be confirmed in the S3 console.
