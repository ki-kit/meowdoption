# 🐱 Meowdoption

A cat adoption website: visitors browse and filter cats, see their photos, hear
their meows and apply to adopt; shelter admins manage cats and review
applications.

| Part | Stack |
|---|---|
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 (Python 3.13) |
| Frontend | React 19 + TypeScript, Vite, React Router, TanStack Query, Tailwind, react-hook-form + zod |
| Database | SQLite in dev, PostgreSQL in test/prod |
| Tests | pytest + pytest-bdd, Vitest + Testing Library, Playwright (+ playwright-bdd) |
| Runtime | Podman + podman-compose; everything runs in containers |

## Development

```sh
podman-compose up -d            # api (:8000) + web (:5173)
```

- App: http://localhost:5173 (Vite proxies `/api` and `/media` to the API)
- API docs: http://localhost:8000/docs
- On start the API runs migrations and seeds 6 sample cats plus a **dev admin**
  (`admin@meowdoption.local` / `meow-dev-password`, set in `compose.yaml`).
- Too many wrong passwords block that email for 15 minutes (see Production).
  In dev all requests share the Vite proxy's IP, so the per-IP limit is raised
  there; the per-account one applies as in production.
- Code reloads on save (file watching polls: the project may live on a
  VirtualBox shared folder, which emits no file events).

After changing `frontend/package.json`, rebuild and reset the modules volume:

```sh
podman-compose stop web && podman rm meowdoption_web_1 && podman volume rm meowdoption_webmodules
podman-compose build web && podman-compose up -d web
```

Start over with a fresh dev database: `podman-compose down && podman volume rm meowdoption_apidata`.

## Tests

```sh
# Backend: BDD features (tests/features/*.feature) + unit tests, on SQLite
podman-compose run --rm api pytest

# ...and on Postgres (includes the concurrent-approval race test)
podman-compose --profile test up -d db
podman-compose run --rm -e TEST_DATABASE_URL=postgresql+psycopg://meow:meow@db:5432/meowdoption api pytest

# Frontend unit/component tests + typecheck
podman-compose run --rm web npm test
podman-compose run --rm web npm run typecheck

# End-to-end (Gherkin features in e2e/features, headless Chromium in a container)
podman-compose up -d api web
podman-compose --profile e2e run --rm e2e
```

e2e runs against the dev database. Scenarios that change data create their own
cats and delete them afterwards; applications they submit use unique
`e2e-…@example.com` addresses.

## API types

The frontend's API types (`frontend/src/api/schema.d.ts`) are **generated** from
the backend's OpenAPI schema, never written by hand:

```sh
scripts/gen-api-types.sh           # after changing a backend schema; commit the result
scripts/gen-api-types.sh --check   # CI: fails if the committed types are stale
```

## Admin accounts

```sh
podman-compose run --rm api python -m app.cli create-admin you@example.com   # prompts for a password
```

Passwords need at least 12 characters. `--password-stdin` reads it from stdin (scripts).

## Production

`compose.prod.yaml` runs Postgres, the API (`backend/Containerfile`, target
`prod`) and nginx serving the built SPA (`frontend/Containerfile`, target `prod`).

```sh
cp .env.prod.example .env.prod      # fill in real secrets (it's gitignored)
podman-compose -p meowdoption-prod -f compose.prod.yaml up -d --build
podman exec -i meowdoption-prod_api_1 python -m app.cli create-admin you@example.com
```

- The site is on port **8080**. Put a TLS-terminating reverse proxy in front:
  auth cookies are `Secure` in production, so **logging in requires HTTPS**.
- The API refuses to start with the dev secret, a secret under 32 characters,
  insecure cookies, or dev-admin variables set.
- Both containers run as non-root users; the API code is read-only to its user.
- nginx: SPA routing, long-lived caching for hashed assets, security headers
  including a strict Content-Security-Policy, 6 MB request body limit. The API
  docs (`/docs`) aren't exposed.
- Migrations run automatically when the API container starts.
- **Login rate limiting**, in two layers:
  - API: failed logins are counted per client IP: 5 per account (IP + email)
    and 20 across accounts, within 15 minutes → `429` with `Retry-After`.
    While blocked, even the correct password is refused. A successful login
    resets that account's count. No email-only lockout, so nobody can lock
    the real admin out from elsewhere. Settings: `MEOW_LOGIN_*` in
    `backend/app/config.py`.
  - nginx: at most 10 login requests/minute per IP (burst 10), which stops
    floods before they reach the (deliberately slow) password hashing.
  - The client IP comes from nginx, which overwrites `X-Forwarded-For` so it
    can't be spoofed. **Behind a TLS proxy/load balancer**, enable the
    `set_real_ip_from` lines in `frontend/nginx/default.conf`; otherwise every
    visitor shares the proxy's IP and one login limit.
- `-p meowdoption-prod` keeps it separate from the dev stack. After changing
  one service, use `down` + `up`: podman-compose 1.3 can't recreate a service
  that another one depends on.

Public e2e scenarios can run against it; `@admin` ones need HTTPS (see above):

```sh
podman run --rm --network meowdoption-prod_default --group-add keep-groups -v ./e2e:/e2e:z \
  -v meowdoption_e2emodules:/e2e/node_modules -w /e2e -e E2E_BASE_URL=http://web:8080 \
  localhost/meowdoption_e2e sh -c "npx bddgen && npx playwright test --grep-invert @admin"
```

## Project layout

```
backend/    app/ (routers, models, schemas, services, storage.py), alembic/, tests/
frontend/   src/ (api/, components/, pages/, hooks/, lib/), nginx/ (prod config)
e2e/        features/*.feature, steps/*.ts
scripts/    gen-api-types.sh
```

## Known limitations

- **Logout** ends the browser session only; a copied Bearer token stays valid
  until it expires (8 h) or the admin is deactivated.
- **Media URLs are relative** (`/media/...`); a future mobile client needs to
  prefix the server's address.
- Media is stored on a local volume (`storage.py` is the seam for S3/MinIO).
