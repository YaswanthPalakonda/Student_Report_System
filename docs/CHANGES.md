# File inventory and behavior changes

## Existing files modified

- `.gitignore`: ignore secrets, dependency cache and test artifacts.
- `package.json`, `package-lock.json`: Playwright development dependency and browser-test command.
- `vite.config.js`: development API proxy with configurable target.
- `src/App.jsx`: shared authentication provider and server-restored route protection.
- `src/components/Auth/Login.jsx`: API login, remembered email, loading/errors, accessible password label; removed default account initialization and plaintext password comparison.
- `src/components/Admin/Admin.jsx`: database-backed users, assignments, dashboard, reports and grading; deactivation/reactivation, report deletion and catalog controls.
- `src/components/Teacher/Teacher.jsx`: scoped roster/subjects, API reports, revision-aware editing, attendance and remarks.
- `src/components/Student/Student.jsx`: own reports and server summaries, refresh, print section ID correction.
- `src/index.css`: one `min-width: 0` correction lets existing table wrappers scroll inside mobile grid columns instead of widening the entire page.
- `backend/server.js`: application factory, configuration, database-first startup and graceful shutdown.
- `backend/config/db.js`: retains Mongoose connection, database name and timeout; factors credential/DNS helpers for validation/testing and sanitizes errors.
- `backend/package.json`, `backend/package-lock.json`: test/provision/check commands and MongoDB test dependency.
- `backend/.gitignore`: ignore test binary/cache.
- `README.md`: updated setup and full-stack documentation links.

## New files

- `.env.example`, `playwright.config.js`, `tests/e2e/workflow.spec.js`
- `src/lib/api.js`, `src/lib/preferences.js`
- `src/context/auth.js`, `src/context/AuthContext.jsx`
- `src/hooks/usePortal.js`, `src/components/PortalStatus.jsx`
- `src/components/Admin/CatalogManager.jsx`
- `backend/.env.example`, `backend/app.js`
- `backend/config/env.js`, `backend/config/connection.js`
- `backend/models/User.js`, `Class.js`, `Subject.js`, `TeacherAssignment.js`, `AcademicReport.js`, `GradingSettings.js`, `AuthSession.js`
- `backend/controllers/auth.js`, `admin.js`, `reports.js`
- `backend/middleware/security.js`, `errors.js`
- `backend/routes/api.js`, `backend/validators/index.js`
- `backend/utils/errors.js`, `grading.js`, `serializers.js`
- `backend/scripts/create-admin.js`, `check-db.js`
- `backend/tests/unit.test.js`, `integration.test.js`, `browser-server.js`
- `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `docs/CHANGES.md`, `docs/VERIFICATION.md`

No original files were deleted. Role-specific CSS, public assets, `src/main.jsx`, and `vercel.json` were preserved. The only CSS change is the mobile overflow correction in `src/index.css`. Installed dependencies, build output, test binaries and generated verification artifacts are ignored. No `.env` was created or modified; no original-project files or real database records were accessed.

## Intentional behavior changes

Account removal deactivates access and preserves academic history. Admin can reactivate an account from Edit User. Roles with existing academic relationships cannot be changed. Administrator accounts require controlled CLI setup.

Class and subject catalogs replace free-text relationships, while retaining the existing Class & Subject screen. One report per student/class/subject prevents duplicate subject rows. Existing reports must be explicitly opened for editing; concurrent edits require the original revision. Teacher access follows current class/subject assignments rather than trusting an author email or the browser.

Passwords require eight characters minimum and at most 72 UTF-8 bytes. Remember Me still remembers email only. Local Storage is used only for theme/email preferences. Legacy browser data is ignored, never imported or erased automatically; it may still contain old plaintext credentials until the user deliberately clears it. Any historical data import needs a separately reviewed migration.

Grading changes save only after validation and the Save button. Report grades retain the policy used at their last save. Polling occurs every 15 seconds while visible and on refocus. There are no WebSockets, semester history, daily attendance ledger, self-service password recovery, email delivery, or automatic legacy migration. Lists currently fetch all records within the authorized scope; pagination and a shared rate-limit store are future scaling work.

The original local Google DNS workaround remains the development default if DNS_SERVERS is unset. Explicitly blank selects system DNS; production defaults to system DNS. URI credential insertion now supports both mongodb+srv and mongodb schemes and detects credentials in the authority rather than anywhere in the URI. Raw connection errors no longer reach logs; callers handle shutdown instead of the connection helper exiting the process.

Express 5 already forwards rejected async route promises to error middleware, so no extra async wrapper dependency was added: [Express documentation](https://expressjs.com/en/5x/guide/error-handling/). Report saves use [Mongoose optimistic concurrency](https://mongoosejs.com/docs/guide.html#optimisticConcurrency).
