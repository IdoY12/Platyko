#!/usr/bin/env bash
# Daily Postgres backup for the production stack: pg_dump (custom format) from the compose
# container, upload to s3://platyko-backups/<host>/, then delete copies older than RETENTION_DAYS.
# Credentials come from the EC2 instance role (see DEPLOY.md, "Backups"). Runs from cron as ubuntu.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/Platyko}"
BUCKET="${BACKUP_BUCKET:-platyko-backups}"
REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
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

# Prune: object keys embed the UTC date, so age is decided from the key, not from S3 metadata.
CUTOFF="$(date -u -d "-${RETENTION_DAYS} days" +%Y-%m-%d)"
aws s3 ls --region "$REGION" "s3://${BUCKET}/${PREFIX}/" | awk '{print $4}' | while read -r key; do
  [[ "$key" =~ ^platyko-([0-9]{4}-[0-9]{2}-[0-9]{2})T ]] || continue
  if [[ "${BASH_REMATCH[1]}" < "$CUTOFF" ]]; then
    aws s3 rm --region "$REGION" --only-show-errors "s3://${BUCKET}/${PREFIX}/${key}"
    echo "pruned ${key}"
  fi
done
echo "[$(date -u +%FT%TZ)] backup done"
