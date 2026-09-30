# 🐱 Meowdoption

A cat adoption website. Visitors browse the shelter's cats, filter them, see
their photos, hear their meows and apply to adopt one. Shelter admins log in
to manage the cats and review the applications.

**Features**

- Cat catalog with filters (sex, castrated, status, good with kids/cats/dogs),
  kept in the URL so a filtered list can be shared
- Cat detail page with a photo gallery and a 🔊 meow button
- Adoption application form, one application per person per cat
- Admin panel: add/edit/delete cats, upload photos and meows, approve or
  reject applications (approving marks the cat adopted and rejects the others)
- Secure admin login with rate limiting against password guessing

## Technologies

| Part | Technologies |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, react-hook-form + zod |
| Database | SQLite in development, PostgreSQL in production |
| Media | Pillow (images), filetype + mutagen (audio) |
| Auth | JWT (httpOnly cookie for the web app, Bearer token for API clients), Argon2 password hashing |
| Tests | pytest + pytest-bdd, Vitest + Testing Library, Playwright + playwright-bdd |
| Runtime | Podman + podman-compose; production served by nginx |

Features are specified as Gherkin scenarios (`*.feature` files), both for the
API (pytest-bdd) and in the browser (Playwright).

## Project structure

```
meowdoption/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── routers/         API endpoints (cats, applications, auth, admin, media)
│   │   ├── models/          database tables (SQLAlchemy)
│   │   ├── schemas/         request/response shapes (Pydantic)
│   │   ├── services/        business rules (application review, uploads, login limits)
│   │   ├── storage.py       where uploaded files are stored
│   │   ├── seed.py          sample cats for development
│   │   └── cli.py           admin commands (create-admin)
│   ├── alembic/             database migrations
│   └── tests/               features/*.feature + step definitions, unit tests
├── frontend/                React single-page app
│   ├── src/
│   │   ├── pages/           public pages and pages/admin/
│   │   ├── components/      reusable UI pieces
│   │   ├── api/             API client + types generated from the backend
│   │   └── hooks/, lib/     data fetching, validation, helpers
│   └── nginx/               production web server config
├── e2e/                     browser tests: features/*.feature + steps/
├── scripts/                 gen-api-types.sh (regenerates the frontend API types)
├── docs/deployment.md       running it in production
├── compose.yaml             development stack
└── compose.prod.yaml        production stack
```

## How to run it

**Prerequisites:** [Podman](https://podman.io) and
[podman-compose](https://github.com/containers/podman-compose) (developed with
Podman 5.4 and podman-compose 1.3), plus git. Everything else (Python, Node,
the database, browsers for testing) runs inside containers; nothing else needs
to be installed.

```sh
git clone https://github.com/ki-kit/meowdoption.git
cd meowdoption
podman-compose up -d
```

The first start builds the images, which takes a few minutes. Then open:

- **Website:** http://localhost:5173
- **API documentation:** http://localhost:8000/docs
- **Admin panel:** http://localhost:5173/admin, log in with the development
  admin `admin@meowdoption.local` / `meow-dev-password`

On start the API applies the database migrations and adds 6 sample cats. Code
changes reload automatically.

```sh
podman-compose logs -f api      # follow the API's log
podman-compose down             # stop everything (data is kept)
podman-compose down && podman volume rm meowdoption_apidata   # start over with a fresh database
```

Create a real admin account (password: at least 12 characters):

```sh
podman-compose run --rm api python -m app.cli create-admin you@example.com
```

### Running the tests

```sh
podman-compose run --rm api pytest                # backend (SQLite)
podman-compose run --rm web npm test              # frontend
podman-compose --profile e2e run --rm e2e         # browser end-to-end (needs `podman-compose up -d` first)
```

<details>
<summary>More: Postgres tests, typecheck, API types, dependency changes</summary>

```sh
# Backend tests on PostgreSQL (includes the concurrent-approval race test)
podman-compose --profile test up -d db
podman-compose run --rm -e TEST_DATABASE_URL=postgresql+psycopg://meow:meow@db:5432/meowdoption api pytest

# Frontend typecheck
podman-compose run --rm web npm run typecheck

# The frontend's API types are generated from the backend; after changing a
# backend schema, regenerate and commit. --check fails if they're stale (CI).
scripts/gen-api-types.sh
scripts/gen-api-types.sh --check

# After changing frontend/package.json: rebuild and reset the node_modules volume
podman-compose stop web && podman rm meowdoption_web_1 && podman volume rm meowdoption_webmodules
podman-compose build web && podman-compose up -d web
```

e2e runs against the development database. Scenarios that change data create
their own cats and delete them afterwards; applications they submit use unique
`e2e-…@example.com` addresses.

In development all browser requests reach the API through the Vite proxy, i.e.
from one IP, so the per-IP login limit is raised there (`compose.yaml`); the
per-account limit works as in production.
</details>

### Production

See **[docs/deployment.md](docs/deployment.md)**: it runs with PostgreSQL and
nginx on port 8080, and needs HTTPS in front for logging in.

## Known limitations

- Logging out ends the browser session only; a copied Bearer token stays valid
  until it expires (8 h) or the admin is deactivated.
- Media URLs are relative (`/media/...`); a future mobile app would need to
  prefix the server's address.
- Uploaded files are stored on a local volume (`storage.py` is where S3/MinIO
  support would go).
