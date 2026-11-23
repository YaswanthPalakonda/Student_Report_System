# API and data model

Base path: `/api`. Responses are `{ success: true, data }`; errors are `{ success: false, message, errors? }`. Health retains the original message/timestamp format. Protected responses use `Cache-Control: no-store`.

## Authentication contract

`POST /auth/login` accepts `{ email, password }`. The response sets a session cookie and returns `{ user, csrfToken }`. JWTs never enter Local Storage or the response body. `GET /auth/me` restores both the profile and the CSRF token. Every mutation requires an allowed `Origin`, `Content-Type: application/json`, and, except login, `X-CSRF-Token`. A JSON `{}` body is sufficient for DELETE/logout. Cookies must accompany API requests. Production cookies are HttpOnly, Secure, host-only, and default to SameSite=Lax. Sessions expire after eight hours by default; Remember Me remembers only the email.

`POST /auth/logout` deletes the server session and clears the cookie. Password/account edits and deactivation increment the account's authentication version and revoke its sessions. Each authenticated request checks the active user and current role in MongoDB. Expired session documents are also removed by a TTL index. There is no public account registration or administrator-creation endpoint.

## Routes

| Method | Path | Permission / behavior |
|---|---|---|
| GET | `/health` | Process health; no database query |
| GET | `/ready` | 200 when connected, otherwise 503 |
| POST | `/auth/login` | Public, rate limited; allowed Origin required |
| GET | `/auth/me` | Current authenticated profile and CSRF token |
| POST | `/auth/logout` | Current session |
| GET | `/admin/dashboard` | Admin counts and overall report average |
| GET | `/users` | Admin; optional `search` and `role` |
| POST | `/users` | Admin creates teacher/student |
| GET | `/users/:id` | Admin views one profile |
| PATCH | `/users/:id` | Admin edits teacher/student; revision required |
| DELETE | `/users/:id` | Admin deactivates account; retains history |
| GET | `/classes`, `/subjects` | Admin sees all; Teacher sees assignments; Student sees own class/reported subjects |
| POST | `/classes`, `/subjects` | Admin creates catalog entry |
| PATCH | `/classes/:id`, `/subjects/:id` | Admin renames entry |
| DELETE | `/classes/:id`, `/subjects/:id` | Admin; blocked if referenced |
| GET | `/assignments` | Admin sees active teachers' assignments; Teacher sees own |
| POST | `/assignments` | Admin assigns teacher/class/subject |
| PATCH | `/assignments/:id` | Admin replaces assignment |
| DELETE | `/assignments/:id` | Admin removes assignment; permissions change on next request |
| GET | `/teacher/students` | Active students in Teacher's assigned classes |
| GET | `/reports` | Admin: all; Teacher: assigned class/subject pairs; Student: own. Optional `search`, `result` |
| GET | `/reports/:id` | Same scope as list; inaccessible records return 404 |
| POST | `/reports` | Teacher creates report for an authorized student/subject |
| PATCH | `/reports/:id` | Teacher updates an authorized existing report; revision required |
| DELETE | `/reports/:id` | Admin permanently deletes the selected report |
| GET | `/student/summary` | Own average marks, attendance, GPA, overall grade, pass rate |
| GET | `/grading-settings` | All authenticated roles |
| PUT | `/grading-settings` | Admin; full validated policy and revision |

Requests reject unknown body fields. IDs must be MongoDB ObjectId strings. 400 means invalid input; 401 unauthenticated; 403 forbidden/origin/CSRF failure; 404 not found or outside report scope; 409 duplicate, stale revision, or referenced record; 413 oversized body; 415 unsupported content type; 429 rate limit; 503 database unavailable. Internal details and raw database errors are not returned.

## Request bodies

Create user: `{ name, email, password, role: "student" | "teacher", classId: string | null, studentId: string }`. Passwords need at least eight characters and at most 72 UTF-8 bytes. A teacher's class/subject relationships belong in assignments, not the user record. Student ID is optional but unique when nonempty.

Edit user: the same profile fields plus `revision` and optional `password`, `active`. Omit password to retain the existing hash. Role changes are blocked when the account has reports or teacher assignments. Administrator accounts cannot be edited/deactivated by these routes.

Catalog: `{ name }`. Assignment: `{ teacherId, classId, subjectId }`.

Report: `{ studentId, subjectId, testMarks, examMarks, attendance, attendanceStatus, remarks }`. Here `studentId` is the MongoDB user ID, not the display student number. PATCH additionally requires `revision`. The server derives class, teacher, totals, percentage, grade, result and policy snapshot. Test range 0–40; exam 0–60; attendance 0–100; status Present/Absent/Late; remarks up to 2,000 characters. Student/class/subject identity cannot change during report editing. A duplicate POST returns 409; open the existing report and PATCH its revision instead.

Grading: `{ passMark, grades: [{ label, min }], revision }`. Labels/thresholds must be unique, thresholds 0–100, and a zero threshold must exist. The initial unsaved default has revision -1. GET a new revision after a conflict. Policy edits do not rewrite historical report grades.

## Mongoose models

| Model | Relationships and constraints |
|---|---|
| User | Unique normalized email; unique nonempty student number; hidden bcrypt hash; role/active state; optional Class reference; authentication version |
| Class | Display name and unique lowercase key |
| Subject | Display name and unique lowercase key |
| TeacherAssignment | Teacher User, Class, Subject; unique triple |
| AcademicReport | Student User, Class, Subject, author User; unique student/class/subject; marks, embedded attendance, remarks, policy snapshot, revision, timestamps |
| GradingSettings | One default policy; pass mark, grade bands, revision |
| AuthSession | Random session ID, User reference, CSRF value, expiry with TTL index |

Relationships use IDs, so email/name edits do not detach academic records. Public DTOs expose `id`, `className`, `studentName`, `teacherEmail`, and other labels expected by the original views; hashes/session internals are excluded. Report DTO `studentRecordId` identifies the User, while `studentId` remains the display number.

Report updates use Mongoose optimistic concurrency and the client revision. Concurrent creation is protected by unique indexes. This system represents one current report per student/class/subject, without a semester/year model or daily attendance ledger. Reports are ordered by creation for the original tables; latest roster entries use update timestamps.

## Preserved grading

Test /40 + exam /60 = total percentage. Defaults: A+ 90, A 80, B 70, C 60, D 50, F 0; pass mark 40. A total of 45 is deliberately **F / Pass**, matching the original. GPA is average percentage /10. Subject report grades use the policy at their last save; overall grade uses the active policy. Attendance is the average of report percentages, not a daily attendance calculation.
