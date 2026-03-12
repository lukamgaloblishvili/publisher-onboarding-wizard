# PX Onboarding Wizard

PX Onboarding Wizard is a focused onboarding workspace for launching new publisher campaigns. It centralizes integration, compliance, shared Slack coordination, and launch resources in one place.

This product is not a replacement for `open.px.com`. It is meant to reduce friction during onboarding so campaigns can move from setup to go-live quickly.

## Structure

- `frontend/`: React + Vite SPA with Tailwind CSS and Zustand stores
- `backend/`: FastAPI API with Postgres persistence, Alembic migrations, and mockable Jira/Monday adapters
- `docker-compose.yml`: local Postgres service for development

## Highlights

- Admin username/password login with secure Argon2 hashing
- Publisher access via one shared access code per publisher workspace
- Multiple notification emails stored per publisher for future outbound notifications
- Tailwind-based frontend styling
- Zustand-backed session and portal state
- Campaign message sending and uploads update local state without page-wide refetches
- Mock Jira and Monday adapters with a documented real-mode path
- Automatic migration run on backend startup and seed bootstrap for demo data

## Demo access

- Admin: `admin` / `admin123`
- Publisher access code: `ACME-ACCESS-2026`

## Local setup

### 1. Start Postgres

```bash
docker compose up -d postgres
```

This starts Postgres on `127.0.0.1:5432` with:

- database: `px_onboarding_wizard`
- username: `px`
- password: `px_password`

### 2. Backend setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Copy `backend/.env.example` to `backend/.env`.
4. Run migrations manually if you want an explicit migration step:

```bash
cd backend
alembic upgrade head
```

5. Start the API:

```bash
cd backend
uvicorn app.main:app --reload
```

The backend also runs `alembic upgrade head` during startup before seeding data.

### 3. Frontend setup

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Install dependencies:

```bash
npm install --prefix frontend
```

3. Start the dev server:

```bash
npm run --prefix frontend dev
```

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

### Backend

- `SECRET_KEY`: session signing secret
- `DATABASE_URL`: Postgres connection string
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `SESSION_COOKIE_SECURE`: `true` or `false`
- `SESSION_MAX_AGE_SECONDS`
- `USE_MOCK_INTEGRATIONS`: `true` or `false`
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `MONDAY_API_TOKEN`
- `MAX_UPLOAD_BYTES`

### Frontend

- `VITE_API_URL`: backend base URL

## Auth model

### Admin

- Signs in with username and password
- Session stored in an httpOnly signed cookie

### Publisher

- Signs in with one shared publisher access code
- There is one login context per publisher, not per individual publisher user
- Admins can rotate the access code from the publisher detail page

## Database and migrations

- Postgres is the default database for local development
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

1. Set `USE_MOCK_INTEGRATIONS=false` in `backend/.env`
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

## Deployment notes for Vercel

Simplest deployment shape:

1. Deploy `frontend/` as a Vercel static project
2. Deploy `backend/` as a separate Vercel project using `backend/api/index.py`
3. Set `VITE_API_URL` in the frontend project to the backend deployment URL
4. Use a managed Postgres database for the backend
5. Set backend environment variables in Vercel

Notes:

- Do not use local Docker Compose Postgres in production
- Local uploads remain suitable for demo environments only; switch to object storage for real deployment
- Set a strong `SECRET_KEY`
- Use secure cookies in production by setting `SESSION_COOKIE_SECURE=true`

## Verification

Recommended local verification steps after dependency install:

```bash
docker compose up -d postgres
cd backend && alembic upgrade head
uvicorn app.main:app --reload
npm run --prefix frontend build
```
