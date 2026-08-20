#!/bin/bash
# ==============================================================================
# 📦 Daily PostgreSQL Backup Script for Hostinger VPS
# Runs via cron: 0 3 * * * /root/kil-library/backup_db.sh
# ==============================================================================

BACKUP_DIR="/root/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/library_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "🔄 Starting Database Backup..."
docker exec -t library_postgres pg_dump -U library_admin library_production_db | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup Successful: ${BACKUP_FILE}"
    # Keep only last 14 days of backups
    find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +14 -delete
    echo "🧹 Old backups (older than 14 days) removed."
else
    echo "❌ Backup Failed!"
fi
