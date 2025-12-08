#!/bin/bash
set -eo pipefail

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Wait for database
log "Waiting for database at ${DATABASE_HOST}:${DATABASE_PORT}..."
while ! nc -z "${DATABASE_HOST}" "${DATABASE_PORT}"; do
    sleep 2
done
log "Database is ready."

# Wait for Redis
log "Waiting for Redis..."
while ! nc -z redis 6379; do
    sleep 2
done
log "Redis is ready."

# Run database migrations
log "Running migrations..."
python manage.py makemigrations --noinput || log "No new migrations to make"
python manage.py migrate --noinput

# Create superuser if not exists (for development)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    log "Creating superuser..."
    python manage.py createsuperuser --noinput || true
fi

# Collect static files
log "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create necessary directories
mkdir -p /app/media/uploads /app/staticfiles

# Set proper permissions
chown -R appuser:appuser /app/staticfiles /app/media
chmod -R 755 /app/staticfiles /app/media

# Start Gunicorn
log "Starting Gunicorn..."
exec gunicorn cleanswitch.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers ${GUNICORN_WORKERS:-3} \
    --threads ${GUNICORN_THREADS:-2} \
    --worker-class gthread \
    --worker-tmp-dir /dev/shm \
    --access-logfile - \
    --error-logfile - \
    --log-level ${GUNICORN_LOG_LEVEL:-info} \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --keep-alive ${GUNICORN_KEEPALIVE:-5} \
    --max-requests ${GUNICORN_MAX_REQUESTS:-1000} \
    --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-50}