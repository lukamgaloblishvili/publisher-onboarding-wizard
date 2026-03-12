# AGENTS.md

## Project
PX Onboarding Wizard

## Objective
Build a simple, clean, fully functional MVP for publisher onboarding and campaign coordination.

The app has two main roles:
- Admin
- Publisher

Admins create and manage publisher workspaces, campaigns, credentials, links to external work items, and resources.
Publishers log in to view their campaigns, track Integration and Compliance progress, send messages, access resources, and use a shared Slack communication entry point.

## Product principles
- Keep everything simple
- Prefer clean UX over feature depth
- Avoid overcomplicated logic and flows
- Build for maintainability and clarity
- Ship a realistic MVP, not a full enterprise platform
- Use adapters and mocks where external integrations are too heavy for first pass

## Stack
- Frontend: React
- Backend: FastAPI
- Hosting target: Vercel
- Auth: admin username/password plus publisher access code
- Database: PostgreSQL via Docker Compose for local development
- Styling: Tailwind CSS

## Required architecture
Use a two-app structure:

- `frontend/` for React app
- `backend/` for FastAPI app

Recommended:
- React + Vite
- Tailwind CSS
- FastAPI + Pydantic
- SQLModel or SQLAlchemy
- PostgreSQL for local and production-configurable deployment
- REST API only

## User roles
### Admin
Can:
- view all publishers
- create and edit publishers
- create and edit campaigns
- generate one shared publisher access code
- manage multiple notification emails per publisher
- set Jira link/key for campaign Integration
- set Monday link/reference for campaign Compliance
- trigger sync
- manage shared Slack link
- customize publisher Resources page

### Publisher
Can:
- log in
- view only their own publisher account
- see all their campaigns
- open campaign details
- read/write messages in Integration thread
- read/write messages in Compliance thread
- upload files/images in Compliance flow
- access one shared Slack communication entry
- view Resources page

## MVP scope
### Must have
- working login
- role-aware app shell
- publisher dashboard
- admin dashboard
- campaign detail view
- Integration entity with Jira adapter
- Compliance entity with Monday adapter
- public-comment sync behavior
- frozen description displayed at top of each entity
- status mapping into simple internal portal statuses
- resources page with default plus custom admin content
- mock data and seed flow

### Nice to have only if easy
- inline success toasts
- search/filter for admin publisher list
- upload previews for images

### Do not build
- SSO
- MFA
- password reset
- advanced permission systems
- real-time sync
- websocket chat
- notification engines
- workflow automation engines
- analytics
- billing
- multi-tenant complexity beyond this MVP

## Data model expectations
At minimum implement entities equivalent to:

- User
- Publisher
- Campaign
- CampaignIntegration
- CampaignCompliance
- Message

Keep schema pragmatic and minimal.

## Integration rules
### Jira / Integration
- Admin links a Jira ticket to a campaign Integration entity
- Initial sync occurs on link
- Subsequent sync pulls updates
- Pull only public comments
- Ignore internal notes
- Pull status
- Freeze description on first sync and show at top
- Publisher can send portal messages that are pushed to Jira as comments
- UI may omit external author names if that simplifies display

### Monday / Compliance
- Similar behavior to Jira sync
- Pull updates and status
- Freeze description on first sync
- Support file/image uploads from the portal
- Publisher messages should push back through adapter

### Integration implementation rule
Implement both:
- mock mode
- real mode via env vars

Abstract all third-party logic behind service adapters.

## Status model
Use a small canonical internal status set:
- `not_started`
- `in_progress`
- `waiting_on_publisher`
- `blocked`
- `completed`

Map Jira and Monday statuses into these through a config-based mapping layer.

## Slack requirement
There is one Slack communication entry per publisher, not per campaign.

For MVP:
- admin sets a Slack URL or embed reference
- publisher sees a shared Slack card/section
- a link-out experience is acceptable if a real embedded Slack client is impractical

## Resources requirement
Each publisher has:
- default resources
- optional admin-customized resources

Keep this simple:
- markdown or structured JSON content
- link cards or simple sections in UI

## Auth rules
- Use secure password hashing
- Use cookie-based sessions or httpOnly-cookie JWTs
- Publisher access should be one shared login per publisher using a token/code
- Publisher sessions may only access their own records
- Admin users may access all records

Keep auth implementation straightforward.

## File uploads
Compliance flow must support file/image upload.

Implementation guidance:
- validate type and size
- store file metadata
- use an abstraction layer for storage
- prefer a Vercel-compatible or cloud-friendly approach over filesystem-only assumptions
- local dev can use local storage if abstracted cleanly

## UI guidance
### Overall
- clean
- minimal
- readable
- desktop-first
- responsive enough
- sparse use of color
- clear hierarchy
- soft borders
- low visual noise

### Pages
#### Shared
- login

#### Publisher
- dashboard
- campaign detail
- resources

#### Admin
- dashboard
- publisher detail/edit
- campaign management

### Components
- status pill
- card layout
- simple form controls
- timeline/chat message list
- frozen description section
- empty/loading/error states

## Branding
Use the following design tokens.

### Colors
- Green: `#299C61`
- Dark Green: `#13743E`
- Green-Gray: `#D3DED8`
- Purple: `#CD62FF`
- Light Green-Gray: `#E8F2EF`
- Light Gray: `#F8F8F8`
- Black: `#232323`
- White: `#FFFFFF`

### Typography
Preferred:
- Roboto Bold for primary headings
- Roboto Light for subheadings
- Roboto Regular for body
- Tahoma Bold as alternative heading
- Tahoma Regular as alternative subheading/body

If exact fonts are inconvenient, use sensible fallbacks while preserving the same visual intent.

## API expectations
Implement concise REST endpoints for:
- auth
- current user
- admin publisher management
- admin campaign management
- linking integration/compliance entities
- sync actions
- message retrieval and posting
- compliance uploads
- resources retrieval

Do not over-expand the API surface.

## Development expectations
When coding:
- make pragmatic choices without pausing for minor ambiguities
- keep files organized
- keep business logic readable
- add comments only where useful
- avoid unnecessary abstractions
- prefer simple service boundaries

## Seed data
Provide a quick demo setup with:
- 1 admin user
- 1 publisher
- 1 publisher access code
- 2 campaigns
- sample Integration thread
- sample Compliance thread
- sample notification emails
- sample resources
- sample Slack link

## Delivery checklist
Before considering the MVP complete, ensure:
- app runs locally
- login works for both roles
- admin can create publisher and campaign records
- publisher can view their campaigns
- Integration and Compliance threads render correctly
- sync functions work in mock mode
- message posting works
- compliance upload works
- resources page works
- README is complete
- `.env.example` exists

## Output expectations for the coding agent
Return:
1. complete source code
2. setup instructions
3. environment variable template
4. seed/bootstrap instructions
5. notes on mock vs real integrations
6. deployment notes for Vercel

## Important implementation bias
Choose the simplest approach that results in a coherent, demonstrable MVP.
Do not optimize for scale or enterprise complexity.
Optimize for clarity, correctness, and speed to a working product.

## Git workflow
- Main branch: `main`
- Feature branches are required for coding work
- Never implement code changes directly on `main`
- Commit messages do not need a strict convention, but must be descriptive
- There are no pull request requirements by default; the user will guide when to push

## Branch relevance check
Before any code edit, run `git branch --show-current`.

If the current branch is `main`, `master`, or clearly unrelated to the request:
- stop and ask the user to create or switch branches first
- suggest a branch name when needed
- recommended format: `<short-feature-slug>`

Treat this as a hard constraint, not optional guidance.
