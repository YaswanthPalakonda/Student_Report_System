# Repeatable verification

All automated data is disposable. Tests do not load `.env`, use `MONGODB_URI`, migrate data, or connect to Atlas.

## Commands (PowerShell)

From the project root:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

From `backend`:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run test:unit
```

The backend suite uses Node's test runner and `mongodb-memory-server` with an actual disposable MongoDB process. The first run downloads a MongoDB binary into `backend/.mongodb-binaries`; allow network access, disk space, process execution and local loopback connections. Later runs reuse it. No external database is accepted by the test fixture. The full suite allows extra time for the first download. Unit tests include a local HTTP health check, so even the unit suite needs loopback access.

Browser tests use Playwright and headless Microsoft Edge by default. They build the frontend, start a disposable API/database on `127.0.0.1:4173`, and run separate Admin/Teacher/Student browser contexts. Port 4173 must be free. To use another installed supported channel, set `PLAYWRIGHT_CHANNEL` (for example `chrome`). Each run generates temporary credentials; no production account is provisioned. Artifacts are ignored under `.test-artifacts`.

Backend coverage includes health/readiness, URI credential encoding, safe error classification, all three logins, current profile, cookies, CSRF, CORS origin rejection, Admin-only user creation, profile edits and search, deactivation, classes/subjects, references and duplicates, assignments, teacher scope, marks, grades, attendance, remarks, Student isolation, report deletion, grading policy history, stale revisions, session expiry, logout replay, and login rate limiting.

Browser coverage includes account creation through the original Admin modal, class/subject management, assignment creation, teacher report submission/editing, independent Student/Admin retrieval, session restoration, remembered email, password visibility, report print CSS, mobile layout, runtime errors, and verification that academic data/passwords are not written to Local Storage.

## Manual acceptance checklist

- Privately configure backend environment and run `npm.cmd run check-db`; confirm the read-only ping.
- Deliberately provision your first administrator with the setup script.
- Start backend and frontend; confirm the existing login layout and both themes.
- Create class and subject; create Teacher and Student; assign Teacher to both.
- Open independent browsers/devices pointing to the same frontend/backend. Confirm Teacher sees only assigned students/subjects.
- Enter test /40, exam /60, attendance and remarks; verify Student and Admin updates within 15 seconds or on refocus.
- Edit marks and attendance. Open the same report in two sessions and verify a stale save is rejected with 409.
- Confirm another Student cannot read the report and a different Teacher cannot modify it.
- Edit account name/email; verify relationships remain and the affected account must sign in again.
- Deactivate/reactivate an account through Admin; verify access is revoked/restored.
- Rename a class/subject; attempt to delete one that is in use and confirm rejection.
- Change grading policy; confirm saved grades stay unchanged until reports are edited.
- Preview/print/save the Student report. Verify report rows remain visible and navigation is hidden.
- Test a slow/unavailable backend, session expiry, and logout; no success message should appear for a failed mutation.
- On approved deployment, verify HTTPS cookie flags, CORS, API proxy and React Router refresh.

Atlas connectivity, actual production provisioning, hosted deployment and physical-device testing require your private configuration and remain separate from local automated tests.
