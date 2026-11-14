#!/usr/bin/env bash
# Daily Postgres backup for the production stack: pg_dump (custom format) from the compose
# container, then upload to s3://platyko-backups/<host>/.
# Credentials come from the EC2 instance role, which can only PutObject on the backups bucket.
# Retention (7 days) is enforced by an S3 lifecycle rule, not by this script (see DEPLOY.md, section 7).
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/Platyko}"
BUCKET="${BACKUP_BUCKET:-platyko-backups}"
REGION="${AWS_REGION:-us-east-1}"
PREFIX="$(hostname)"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
FILE="platyko-${STAMP}.dump"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

compose() {
  docker compose --env-file "$REPO_DIR/.env.production" -f "$REPO_DIR/docker-compose.prod.yml" "$@"
}

echo "[$(date -u +%FT%TZ)] backup start -> s3://${BUCKET}/${PREFIX}/${FILE}"
compose exec -T postgres pg_dump -U platyko -Fc platyko > "${WORK_DIR}/${FILE}"
test -s "${WORK_DIR}/${FILE}"
aws s3 cp --region "$REGION" --only-show-errors "${WORK_DIR}/${FILE}" "s3://${BUCKET}/${PREFIX}/${FILE}"
echo "[$(date -u +%FT%TZ)] backup done"
