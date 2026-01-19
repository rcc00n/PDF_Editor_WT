# Environment Variables

## Nginx
- `PORT`: listen port for nginx (defaults to 8080 in Procfile/nginx configs).
- `NGINX_WORKER_PROCESSES`: nginx worker_processes (default: 1).
- `NGINX_WORKER_CONNECTIONS`: nginx worker_connections (default: 1024).

## Backend
- `PORT`: gunicorn bind port (defaults to 8000 in backend Procfile).
- `DATA_DIR`: data root for sqlite/media (default: `/app/data`).
- `DATABASE_URL`: database DSN (defaults to sqlite in `DATA_DIR`).
- `DJANGO_SECRET_KEY`: Django secret key.
- `DJANGO_DEBUG`: enables debug mode (`1`, `true`, `yes`, `on`).
- `DJANGO_ALLOWED_HOSTS`: comma-separated hostnames.
- `CORS_ALLOWED_ORIGINS`: comma-separated origins.
- `CSRF_TRUSTED_ORIGINS`: comma-separated origins.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: credentials for seed admin user.
- `WORKER_EMAIL`, `WORKER_PASSWORD`: credentials for seed worker user.
