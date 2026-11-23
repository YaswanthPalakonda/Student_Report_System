# Student Report System

A React + Vite frontend with an Express 5 / Mongoose backend for shared academic records. The existing Admin, Teacher and Student layouts, themes and print styles are retained. MongoDB is now authoritative; browser storage holds only theme and remembered-email preferences.

## Local setup

Use Node.js 24 LTS. In PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.

From this workspace root:

```powershell
npm.cmd ci
```

From `backend`:

```powershell
npm.cmd ci
```

Privately create `backend/.env` using `backend/.env.example` as the template. No real `.env` is included or created by this implementation. Never paste secrets into chat or commit them.

| Variable | Meaning |
|---|---|
| PORT | API listener, default 5000 |
| NODE_ENV | development or production |
| FRONTEND_URL | Exact allowed frontend origin(s), comma separated; local default http://localhost:5173 |
| MONGODB_URI | Atlas URI, optionally already containing credentials |
| MONGODB_USERNAME / MONGODB_PASSWORD | Required only when credentials are absent from the URI; URL-encoded by the helper |
| JWT_SECRET | Required private random secret, at least 32 characters; placeholder values rejected |
| SESSION_HOURS | JWT/session lifetime; default 8, maximum 168 |
| DNS_SERVERS | Comma-separated IP addresses; default 8.8.8.8 in development, system DNS in production; blank explicitly selects system DNS |
| COOKIE_SAME_SITE | lax by default; none only for HTTPS cross-site setups |
| TRUST_PROXY | Verified trusted proxy hop count, default 0 |

The database name remains `student_report_system`. To check your privately configured connection without changing academic records, run from `backend`:

```powershell
npm.cmd run check-db
```

A database connection was tested only against disposable local MongoDB during implementation. Your Atlas connectivity has not been verified.

## Provision the administrator

There is no public signup and no default administrator credential. When you deliberately choose to provision an account, privately provide `PROVISION_ADMIN=yes`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the backend environment and run:

```powershell
npm.cmd run create-admin
```

The script creates an administrator, refuses to overwrite an existing email, and never prints the password. Remove the setup password/flag from your private environment afterward. Admin then creates all Teacher/Student accounts through the portal. Passwords must be at least eight characters and no more than 72 UTF-8 bytes.

## Run locally

Terminal 1, in `backend`:

```powershell
npm.cmd run dev
```

Terminal 2, in the project root:

```powershell
npm.cmd run dev
```

Open http://localhost:5173. The Vite development proxy sends `/api` to the backend at port 5000. Optional root environment variables are `VITE_API_BASE_URL=/api` and `API_PROXY_TARGET=http://localhost:5000`. `VITE_` values are public; never use them for secrets.

For LAN testing, run Vite with `npm.cmd run dev -- --host 0.0.0.0`, allow the chosen frontend port through your firewall, and add the exact LAN frontend origin to backend `FRONTEND_URL`. Each device must open that same frontend address; the Vite proxy reaches the one backend. Deploy behind HTTPS for production.

## Verification

```powershell
# Project root
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e

# backend directory
npm.cmd test
npm.cmd run test:unit
```

Backend tests use a disposable actual MongoDB server and never read `.env` or touch Atlas. First run requires a binary download; browser tests use headless Edge and three independent browser contexts. See the testing guide for prerequisites, coverage, artifacts and the manual checklist.

## Documentation

- [API endpoints, payloads, permissions and database models](docs/API.md)
- [Testing instructions and manual acceptance checklist](docs/TESTING.md)
- [Actual verification results and remaining environment checks](docs/VERIFICATION.md)
- [Vercel and Node hosting deployment instructions](docs/DEPLOYMENT.md)
- [Created/modified files, intentional changes and limitations](docs/CHANGES.md)

The existing Vercel SPA rewrite is preserved. A production API proxy rule must be added with the actual backend hostname before deploying with the default `/api` base URL. Nothing has been deployed.

## Academic behavior

Test marks /40 plus exam marks /60 produce total percentage. Default grade thresholds are A+ 90, A 80, B 70, C 60, D 50, F 0, with pass mark 40. The original F/Pass combination for 40-49 is retained. GPA is mean percentage divided by 10. Attendance is stored per report as a percentage and Present/Absent/Late status.

There is one current report per student/class/subject. Teacher permissions are enforced server-side using assignments; Students see only their own records. Updates appear on refocus or within 15 seconds in visible portals. Account removal deactivates login while retaining academic history. Legacy browser records are ignored and are not automatically migrated or erased.
