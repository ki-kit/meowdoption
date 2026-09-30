# Deployment

`compose.prod.yaml` runs three containers:

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:17-alpine` | Database (volume `pgdata`) |
| `api` | `backend/Containerfile`, target `prod` | FastAPI; not published, only reachable by nginx |
| `web` | `frontend/Containerfile`, target `prod` | nginx: serves the built SPA, proxies `/api` and `/media`, port **8080** |

## Start

```sh
cp .env.prod.example .env.prod      # fill in real secrets (the file is gitignored)
podman-compose -p meowdoption-prod -f compose.prod.yaml up -d --build
podman exec -i meowdoption-prod_api_1 python -m app.cli create-admin you@example.com
```

- `-p meowdoption-prod` gives it its own project name, so it never clashes with
  the dev stack.
- Migrations run automatically when the API container starts (it retries while
  Postgres is still starting).
- After changing one service, use `down` + `up`: podman-compose 1.3 can't
  recreate a service that another one depends on.

## HTTPS is required

Put a TLS-terminating reverse proxy or load balancer in front of port 8080.
Auth cookies are `Secure` in production, so **logging in only works over HTTPS**.

Behind such a proxy, nginx sees the proxy's IP for every visitor. Enable the
`set_real_ip_from` lines in `frontend/nginx/default.conf` (with your proxy's
address), otherwise all visitors share one login rate limit.

## Built-in safeguards

- **Startup checks:** the API refuses to start with the dev secret, a secret
  under 32 characters, non-`Secure` cookies, or dev-admin variables set.
- **Containers** run as non-root users; the API code is read-only to its user.
- **nginx:** SPA routing, long-lived caching for hashed assets, security
  headers incl. a strict Content-Security-Policy, 6 MB request body limit.
  The API docs (`/docs`) aren't exposed.
- **Login rate limiting**, two layers:
  - API: failed logins per client IP: 5 per account (IP + email) and 20
    across accounts within 15 minutes → `429` with `Retry-After`. While
    blocked, even the correct password is refused; a successful login resets
    that account's count. There's deliberately no email-only lockout, so
    nobody can lock the real admin out from elsewhere. Tunable via the
    `MEOW_LOGIN_*` settings in `backend/app/config.py`.
  - nginx: at most 10 login requests/minute per IP (burst 10), stopping floods
    before they reach the deliberately slow password hashing.
  - nginx overwrites `X-Forwarded-For` with the client address, so the IP the
    limits use can't be spoofed.
- **Uploads:** photos are re-encoded to WebP (metadata incl. GPS stripped),
  sounds are checked by content; files get random names.

## e2e against the production stack

Public scenarios can run against it. `@admin` ones need a login cookie, which
requires HTTPS (see above), so they're excluded:

```sh
podman run --rm --network meowdoption-prod_default --group-add keep-groups -v ./e2e:/e2e:z \
  -v meowdoption_e2emodules:/e2e/node_modules -w /e2e -e E2E_BASE_URL=http://web:8080 \
  localhost/meowdoption_e2e sh -c "npx bddgen && npx playwright test --grep-invert @admin"
```
