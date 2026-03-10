# PX Onboarding Wizard

Simple MVP for publisher onboarding and campaign coordination with a React frontend and FastAPI backend.

## Structure

- `frontend/`: React + Vite SPA
- `backend/`: FastAPI API, SQLite-first persistence, mockable Jira/Monday adapters

## Features

- Username/password login with signed httpOnly session cookies
- Role-aware admin and publisher experiences
- Publisher dashboard with campaign list, shared Slack link, and resources
- Admin dashboard for publisher creation, campaign management, credential creation, and ticket linking
- Campaign detail view with Integration and Compliance timelines
- Mock Jira and Monday adapters with a documented real-mode path
- Compliance file uploads via a storage abstraction
- Automatic seed data on first startup

## Demo credentials

- Admin: `admin` / `admin123`
- Publisher: `publisher` / `publisher123`

## Local setup

### Backend

1. Create a virtual environment and activate it.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Copy `backend/.env.example` to `backend/.env` and adjust values if needed.
4. Start the API from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The backend will create the SQLite database and seed demo data automatically on startup.

### Frontend

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

- No separate seed command is required.
- On first backend startup, `backend/app/db/seed.py` inserts:
  - 1 admin user
  - 1 publisher user
  - 1 publisher
  - 2 campaigns
  - Sample Integration and Compliance entities
  - Sample messages, resources, and Slack link

## Environment variables

### Backend

- `SECRET_KEY`: session signing secret
- `DATABASE_URL`: SQLite by default, replace with a production database URL if needed
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `USE_MOCK_INTEGRATIONS`: `true` or `false`
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `MONDAY_API_TOKEN`
- `MAX_UPLOAD_BYTES`

### Frontend

- `VITE_API_URL`: backend base URL

## Mock vs real integrations

By default, the backend runs in mock mode.

- Jira mock adapter returns a synthetic ticket, public comments, and accepts pushed comments.
- Monday mock adapter returns a synthetic item, updates, and accepts updates and file uploads.

To switch toward live integrations:

1. Set `USE_MOCK_INTEGRATIONS=false` in `backend/.env`.
2. Provide Jira credentials:
   - `JIRA_BASE_URL`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
3. Provide `MONDAY_API_TOKEN`.

Current live-mode notes:

- Jira uses the issue and comment REST endpoints and skips comments with visibility metadata.
- Monday uses the GraphQL API for item status, updates, and posting updates.
- File uploads remain abstracted locally; replace `StorageService` and `MondayAdapter.upload_file` for blob storage and live file propagation.

## API summary

Main endpoints implemented:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /admin/publishers`
- `POST /admin/publishers`
- `GET /admin/publishers/{id}`
- `PATCH /admin/publishers/{id}`
- `POST /admin/publishers/{id}/users`
- `POST /admin/publishers/{id}/campaigns`
- `PATCH /admin/campaigns/{id}`
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

1. Deploy `frontend/` as a Vercel static project.
2. Deploy `backend/` as a separate Vercel project using `backend/api/index.py`.
3. Set `VITE_API_URL` in the frontend project to the backend deployment URL.
4. Set backend environment variables in Vercel.

Notes:

- SQLite is fine for local demo use. For production, point `DATABASE_URL` at a managed SQL database.
- Local uploads are suitable for MVP demo environments. For real deployment on Vercel, replace local storage with blob or object storage.
- Session cookies are signed; set a strong `SECRET_KEY` in production and enable HTTPS.

## Verification

Validated locally in this workspace:

- Python source compiles with `python -m compileall backend/app`

Not completed in this workspace:

- `pip install -r backend/requirements.txt`
- `npm install --prefix frontend`
- Full frontend/backend runtime smoke test

Those steps require dependency installation in the environment.
