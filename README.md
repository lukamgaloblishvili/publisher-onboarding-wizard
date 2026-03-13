# PX Onboarding Wizard

PX Onboarding Wizard is a focused onboarding workspace for launching new publisher campaigns. It centralizes integration, compliance, shared Slack coordination, and launch resources in one place.

This product is not a replacement for `open.px.com`. It is meant to reduce friction during onboarding so campaigns can move from setup to go-live quickly.

## Structure

- `frontend/`: React + Vite SPA with Tailwind CSS and Zustand stores
- `backend/`: FastAPI API with Postgres persistence, Alembic migrations, and mockable Jira/Monday adapters
- `docker-compose.yml`: full local stack for frontend, backend, and Postgres

## Highlights

- Admin username/password login with secure Argon2 hashing
- Publisher access via one shared access code per publisher workspace
- Encrypted session cookies and encrypted publisher contact/slack values at rest
- Mock Jira and Monday adapters with a documented real-mode path
- Full container setup for frontend, backend, and Postgres
- Automatic migration run on backend startup and seed bootstrap for demo data

## Demo access

- Admin: `admin` / `admin123`
- Publisher access code: `ACME-ACCESS-2026`

## Security notes

- Do not commit live credentials to tracked files.
- Treat any previously committed Jira or Monday credentials as compromised and rotate them.
- Use a strong `SECRET_KEY` outside local development.
- Prefer setting `DATA_ENCRYPTION_KEY` explicitly in deployed environments instead of relying on the derived development fallback.

## Local setup

### Option 1: full Docker stack

1. Copy `.env.example` to `.env`.
2. Review the values, especially `BACKEND_SECRET_KEY`, `BACKEND_DATA_ENCRYPTION_KEY`, and any live integration credentials.
3. Start the full stack:

```bash
docker compose up --build
```

Services:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- postgres: `127.0.0.1:5432`

### Option 2: run apps directly

1. Start Postgres only:

```bash
docker compose up -d postgres
```

2. Backend setup:

```bash
pip install -r backend/requirements.txt
copy backend\.env.example backend\.env
cd backend
uvicorn app.main:app --reload
```

3. Frontend setup:

```bash
npm install --prefix frontend
copy frontend\.env.example frontend\.env
npm run --prefix frontend dev
```

The backend runs migrations on startup before seeding demo data.

## Seed / bootstrap

On first backend startup, `backend/app/db/seed.py` inserts:

- 1 admin user
- 1 publisher
- 1 shared publisher access code
- 2 campaigns
- Sample integration and compliance threads
- Sample notification emails
- Sample resources
- Sample shared Slack link

## Environment variables

### Root `.env` for Docker Compose

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_ENVIRONMENT`
- `BACKEND_SECRET_KEY`
- `BACKEND_DATA_ENCRYPTION_KEY`
- `BACKEND_DATABASE_URL`
- `BACKEND_CORS_ORIGINS`
- `BACKEND_SESSION_COOKIE_SECURE`
- `BACKEND_SESSION_MAX_AGE_SECONDS`
- `BACKEND_USE_MOCK_INTEGRATIONS`
- `BACKEND_JIRA_BASE_URL`
- `BACKEND_JIRA_EMAIL`
- `BACKEND_JIRA_API_TOKEN`
- `BACKEND_INTEGRATION_SYNC_INTERVAL_SECONDS`
- `BACKEND_INTEGRATION_AUTO_SYNC_ENABLED`
- `BACKEND_MONDAY_API_TOKEN`
- `BACKEND_MAX_UPLOAD_BYTES`
- `BACKEND_PORT`
- `FRONTEND_VITE_API_URL`
- `FRONTEND_PORT`

For Docker Compose, leave `FRONTEND_VITE_API_URL` empty to let the frontend call the backend on the same host using port `8000`.

### Backend `.env`

- `ENVIRONMENT`
- `SECRET_KEY`
- `DATA_ENCRYPTION_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `SESSION_COOKIE_SECURE`
- `SESSION_MAX_AGE_SECONDS`
- `USE_MOCK_INTEGRATIONS`
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `INTEGRATION_SYNC_INTERVAL_SECONDS`
- `INTEGRATION_AUTO_SYNC_ENABLED`
- `MONDAY_API_TOKEN`
- `MAX_UPLOAD_BYTES`

### Frontend `.env`

- `VITE_API_URL`

## Auth model

### Admin

- Signs in with username and password
- Passwords are Argon2-hashed
- Session stored in an encrypted httpOnly cookie

### Publisher

- Signs in with one shared publisher access code
- Access codes are stored as hashes only
- There is one login context per publisher, not per individual publisher user
- Admins can rotate the access code from the publisher detail page

## Sensitive data handling

Current protections:

- Admin passwords are hashed with Argon2
- Publisher access codes are hashed with Argon2
- Session cookies are encrypted and authenticated
- Stored publisher Slack URLs and notification email payloads are encrypted before persistence

Current limits:

- Third-party credentials are expected to come from environment variables, not from the database
- Uploaded files are stored locally for MVP use and should be moved to object storage for real deployments

## Database and migrations

- Postgres is the default database for local and containerized development
- Alembic migration config lives in `backend/alembic.ini` and `backend/alembic/`
- Initial schema migration is `backend/alembic/versions/20260312_0001_initial_postgres_schema.py`

Useful commands:

```bash
cd backend
alembic upgrade head
alembic downgrade -1
```

## Mock vs real integrations

By default, the backend runs in mock mode.

- Jira mock adapter returns a synthetic ticket, public comments, and accepts pushed comments
- Monday mock adapter returns a synthetic item, updates, and accepts updates and file uploads

To switch toward live integrations:

1. Set `USE_MOCK_INTEGRATIONS=false`
2. Provide Jira credentials:
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
3. Provide `MONDAY_API_TOKEN`

Current live-mode notes:

- Jira uses issue and comment REST endpoints and skips comments with visibility metadata
- Monday uses the GraphQL API for item status, updates, and posting updates
- File uploads remain local for MVP purposes; replace `StorageService` and `MondayAdapter.upload_file` for blob/object storage

## API summary

Main endpoints implemented:

- `POST /auth/admin/login`
- `POST /auth/publisher/login`
- `POST /auth/logout`
- `GET /me`
- `GET /admin/publishers`
- `POST /admin/publishers`
- `GET /admin/publishers/{id}`
- `PATCH /admin/publishers/{id}`
- `POST /admin/publishers/{id}/access-code/reset`
- `DELETE /admin/publishers/{id}`
- `POST /admin/publishers/{id}/campaigns`
- `PATCH /admin/campaigns/{id}`
- `DELETE /admin/campaigns/{id}`
- `POST /admin/campaigns/{id}/integration/link`
- `POST /admin/campaigns/{id}/compliance/link`
- `POST /admin/integration/{id}/sync`
- `POST /admin/compliance/{id}/sync`
- `GET /publishers/current`
- `GET /campaigns/{id}`
- `POST /integration/{id}/messages`
- `POST /compliance/{id}/messages`
- `POST /compliance/{id}/upload`
- `GET /resources/current`

## Deployment notes

This repository is now container-friendly rather than tied to one hosting provider.

- `backend/Dockerfile` builds the FastAPI API image
- `frontend/Dockerfile` builds and serves the static frontend with Nginx
- `docker-compose.yml` runs the full stack locally

For deployment on a container platform:

1. Build and run `backend/` and `frontend/` as separate services or containers
2. Use a managed Postgres database
3. Provide all secrets through the platform secret manager
4. Set a strong `SECRET_KEY`
5. Set `DATA_ENCRYPTION_KEY`
6. Set `SESSION_COOKIE_SECURE=true`

## Verification

Recommended local verification steps:

```bash
npm run --prefix frontend build
pip install -r backend/requirements.txt
docker compose config
```
