# Verification results — 23 November 2026

Implementation and verification were performed in the Sample workspace. No production credentials, real records, original-project files, or deployment were used.

| Check | Final result |
|---|---|
| Frontend dependency installation (`npm.cmd ci`) | Passed |
| Backend dependency installation (`npm.cmd ci`) | Passed |
| Frontend lint (`npm.cmd run lint`) | Passed, no warnings/errors |
| Frontend production build (`npm.cmd run build`, also run by E2E command) | Passed; 40 modules; CSS 15.05 kB, JavaScript 315.10 kB before gzip |
| Backend suite (`npm.cmd test`) | Passed: 15 checks, 0 failed, 0 cancelled, 0 skipped; final run about 15 seconds |
| Browser suite (`npm.cmd run test:e2e`) | Passed: 1 complete workflow across 3 isolated browser sessions; final run about 2.8 minutes including fixture startup/teardown |
| Backend server syntax (`node --check backend/server.js`) | Passed |
| Database integration | Passed against an actual disposable local MongoDB process; Atlas not tested |
| Desktop/mobile report screenshots | Inspected; mobile overflow corrected and regression assertion passed |
| Print behavior | Button invoked print; report visible and navigation hidden under print CSS; test PDF generated |
| Private `.env` | Not present, created, modified, or read |
| Existing Vercel SPA rewrite | Preserved |

## What the passing browser workflow exercised

Administrator login with password visibility and Remember Me; class/subject creation; Teacher and Student account creation; assignment creation; separate Teacher/Student logins; marks, attendance and remarks submission; Student and Admin retrieval from independent browser contexts; report editing; session restoration after reload; print-button invocation; print CSS and PDF output; 390px mobile viewport without page-wide overflow; no academic/password Local Storage keys; logout; remembered email retained and password cleared. No browser JavaScript exceptions occurred in that workflow.

Generated synthetic-data artifacts (ignored by Git): `.test-artifacts/student-report.png`, `.test-artifacts/student-mobile.png`, `.test-artifacts/report-card.pdf`. Test temporary directories are directed inside `.test-artifacts/tmp`; database binaries are cached inside `backend/.mongodb-binaries`.

## Earlier unsuccessful attempts and their resolutions

- Restricted dependency installs encountered filesystem/network restrictions. Re-running the authorized installs with the required execution access succeeded.
- The initial health unit check could not access loopback under the sandbox. Running with loopback access passed.
- The first full database run downloaded MongoDB and exhausted its total timeout near the end. The cached rerun passed; the first-download allowance was increased.
- Browser tests exposed ambiguous implicit form labels. Explicit accessible labels were added without changing appearance. A test navigation selector was corrected to the existing Marks & Attendance button.
- A five-second browser assertion expired while login was still processing on the slow host. The browser suite now allows 30-second actions/assertions and a four-minute workflow deadline; the completed workflow passed.
- A concurrent final backend/browser run exceeded the test MongoDB launcher's default ten-second startup deadline. Test fixture launch allowance is now 60 seconds; the backend suite was rerun alone and all 15 checks passed.

There are no unresolved failures in the final lint/build/backend/browser checks. Vite emitted a build-plugin timing diagnostic on the slow host; it did not fail the build. Playwright emitted a NO_COLOR/FORCE_COLOR environment warning; it did not affect the test result.

## Not verified or performed

- MongoDB Atlas DNS/network/account connectivity using your private settings.
- Real administrator provisioning or writes to an existing database.
- Vercel/backend deployment, production TLS/proxy/cookie configuration, or physical devices over a hosted network.
- Legacy Local Storage import, academic-year/semester history, daily attendance, email delivery, or self-service password recovery (not implemented).

Use the private environment setup in README, the read-only `npm.cmd run check-db` command, and the manual checklist in TESTING.md to finish environment-specific acceptance. Deployment needs the real backend hostname added to the documented API proxy configuration.
