# Leyes-IA Backend

> Work in progress — basic project README. Contributions and clarifications welcome.

## Project

This repository contains the backend for the Leyes-IA project: an API server that manages projects, knowledge bases, surveys, file uploads and integrations with AI services.

## Tech stack

- Node.js
- Express
- Sequelize (Postgres migrations/models)
- S3-compatible uploads
- Docker (optional)

## Getting started

Prerequisites:

- Node.js 18+ and `npm`
- A Postgres database (or configured via Docker)
- (Optional) Docker and Docker Compose

Install dependencies:

```bash
npm install
```

Run locally (development):

```bash
# set your environment variables (DB, S3, etc.)
npm start
```

Run with Docker (example):

```bash
docker build -t leyes-ia-backend .
docker run -e NODE_ENV=production -p 3000:3000 leyes-ia-backend
```

## Environment / Configuration

Configuration files live under the `config/` folder. Common env vars used by the project include database connection settings, S3 credentials, and any API keys for external services. This README will be expanded with a full `.env` reference.

## Project structure (high level)

- `controllers/` — Express route handlers
- `models/` — Sequelize models and DB schema
- `migrations/` — Sequelize migrations
- `services/` — external service integrations (S3, AI, DB helpers)
- `routes/` — Express routing
- `helpers/` — utility modules
- `uploads/` — stored upload files (gitignored)

## API

See `routes/` for available endpoints. This README will later include sample requests for the main endpoints (projects, knowledge bases, agents, surveys, uploads).

### API segmentation (Hub vs Management)

The API is now split by usage context:

- **Public Hub** (citizen-facing, only published projects)
	- `GET /hub/projects`
	- `GET /hub/projects/categories`
	- `GET /hub/projects/latest-published`
	- `GET /hub/projects/slug/:projectSlug`

- **Project lifecycle** (authenticated, owner/admin/legislator flows)
	- `GET /projects` (managed listing, supports query `scope=managed`)
	- `POST /projects` (create project)

- **Project management** (dashboard/admin for a specific project)
	- Base: `/:projectId/manage` mounted under `/projects`
	- Example endpoints:
		- `GET /projects/:projectId/manage`
		- `PUT /projects/:projectId/manage/fields`
		- `POST /projects/:projectId/manage/publish`
		- `POST /projects/:projectId/manage/unpublish`
		- `GET /projects/:projectId/manage/members`
		- `POST /projects/:projectId/manage/members`
		- `GET /projects/:projectId/manage/surveys`
		- `GET /projects/:projectId/manage/knowledge-base/status`

### Access rules

- Hub endpoints do not require authentication and must only return published projects.
- Management endpoints require authentication and project membership (or admin role).
- Mutating management actions (publish, edit fields, members changes, survey generation) require edit permissions.

Related middleware:

- `authenticate`
- `requireProjectViewAccess`
- `requireProjectEditAccess`

See [middlewares/projectAccess.js](middlewares/projectAccess.js) for role details (`owner`, `manager`, `supporter`).

## Development notes

- Migrations are in `migrations/` and use Sequelize CLI patterns.
- Seed or test data instructions will be added soon.

## Contributing

Please open issues or PRs. If you'd like certain README sections added (detailed env vars, endpoint examples, deployment steps), tell me which and I will expand this file.

## License

TBD

## Contact

Project maintainer: see repository owner/contact info.

---

This README is intentionally minimal for now and will be expanded on request.
