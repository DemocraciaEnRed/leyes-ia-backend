# Copilot Instructions for leyes-ia-backend

## Scope and architecture
- Backend stack: Express 5 + Sequelize (`models/`, `migrations/`, `routes/`, `controllers/`, `services/`).
- Route registration entry point is `routes/index.js`.
- API surface is intentionally segmented:
  - Public Hub: `/hub/projects/*` (published-only read endpoints).
  - Project lifecycle: `/projects` (authenticated list/create flows).
  - Project management: `/projects/:projectId/manage/*` (member/admin dashboard operations).

## Access and authorization patterns
- `authenticate` (`middlewares/authenticate.js`) is optional-auth and attaches `req.user` when JWT is valid.
- Project access control is centralized in `middlewares/projectAccess.js`:
  - `requireProjectViewAccess` for member/admin reads.
  - `requireProjectEditAccess` for owner/manager/admin mutations.
- Keep middleware layering consistent with `routes/projects/index.js` and `routes/projects/manage.js`.

## Domain workflow conventions
- Project creation (`controllers/projectController.js#createProject`) is a multi-step workflow:
  - validate auth and role (`legislator` or `admin`)
  - accept `projectPdf` via Multer memory storage (`services/multer.js`)
  - create DB records (`Project`, `ProjectMember`, `ProjectFile`)
  - upload file to Spaces (`services/s3Client.js`)
  - provision Gradient knowledge base (`services/gradient.js`)
  - persist logs/audit (`services/systemLog.js`, `services/aiUsageAudit.js`)
- Treat this as an atomic business flow: avoid partial rewrites that skip one subsystem.

## Integrations and config
- JWT auth uses Passport strategy from `middlewares/jwt.js`; secret is `JWT_SECRET`.
- On startup, `index.js` verifies DB connectivity and runs pending migrations via `services/migrations.js`.
- External dependencies include DigitalOcean Spaces/Gradient and Google Gemini; required env vars are documented in `.env.example`.

## Development workflow
- Use Node version from `.nvmrc` (`v22.20.0`): run `nvm use` before installs.
- Commands:
  - `npm run dev` for nodemon local development.
  - `npm start` for normal server run.
- `npm test` is currently a placeholder; validate changes by running the server and exercising affected endpoints.

## Change guidance for AI agents
- Keep Hub endpoints public and published-only.
- Keep management endpoints under `/projects/:projectId/manage/*` with existing access middleware.
- Reuse existing middleware/utilities; do not introduce parallel authorization systems.
- Preserve controller/service boundaries (`routes` wire HTTP, `controllers` orchestrate, `services` integrate external systems).