# Student Report System — Backend API Documentation

Backend for the experimental Student Report System. The React frontend is not yet integrated; this document describes the API contract for the integration work.

## 1. Base URL and response format

| Environment | Base URL |
|---|---|
| Local backend | `http://localhost:5000/api` |
| Local frontend origin | `http://localhost:5173` (CORS allowed by default) |
| Vercel | Same origin as the deployed site, under `/api` |

All requests and responses use JSON.

### Success envelope

```json
{
  "data": {}
}
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid.",
    "details": {
      "fields": [
        { "field": "testMarks", "message": "Test marks must be at most 40." }
      ]
    }
  }
}
```

`details` is present only when useful. Stack traces are never returned in production.

### Common status codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Malformed JSON or invalid identifier |
| `401` | Missing, expired or invalidated session |
| `403` | Authenticated but forbidden, or CSRF/CORS failure |
| `404` | Resource not found or intentionally hidden from the current role |
| `409` | Duplicate email or duplicate teacher assignment |
| `422` | Validation failure |
| `429` | Login rate limit exceeded |
| `503` | Database temporarily unavailable |

---

## 2. Authentication and CSRF

### Session model

- Login returns a signed JWT in an `httpOnly` cookie named `srs_session`.
- Passwords are hashed with bcryptjs.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`.
- `rememberMe: true` gives a longer cookie/session lifetime (default 30 days).
- `rememberMe: false` gives a session cookie whose JWT expires in 8 hours.
- API responses never include `password`, `passwordHash`, or `tokenVersion`.
- Sessions are invalidated when the account is deleted, deactivated, or its password is changed.
- There is no public signup and no self-service password-change endpoint.

### CSRF protection

All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a double-submit CSRF token.

1. Call `GET /api/auth/csrf`.
2. The response sets a readable cookie named `srs_csrf` and returns the token.
3. Send the same token in the `X-CSRF-Token` header on every state-changing request.
4. Send cookies with `credentials: "include"` in browser fetch calls.

```http
GET /api/auth/csrf HTTP/1.1
```

```json
{
  "data": {
    "csrfToken": "a-random-hex-token"
  }
}
```

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json
X-CSRF-Token: a-random-hex-token

{
  "email": "admin@example.com",
  "password": "the-admin-password",
  "rememberMe": false
}
```

> The CSRF token is not a bearer credential. It only works together with the matching CSRF cookie.

### Role model

| Role | Created by | Login redirect |
|---|---|---|
| `admin` | Seed script only | `/admin` |
| `teacher` | Admin API | `/teacher` |
| `student` | Admin API | `/student` |

Login is role-agnostic: the API returns `user.role`, and the frontend redirects to the matching portal.

---

## 3. Endpoints

### 3.1 Health

#### `GET /api/health`

Public. No authentication, database connection, or CSRF token required.

Response:

```json
{
  "data": {
    "status": "ok",
    "service": "student-report-system-api",
    "database": "connected",
    "timestamp": "2026-11-24T10:00:00.000Z"
  }
}
```

`database` is `connected` or `disconnected`. No connection string or secret is exposed.

---

### 3.2 Authentication

#### `GET /api/auth/csrf`

Public. Issues the CSRF cookie and token. See section 2.

#### `POST /api/auth/login`

Public but CSRF-protected.

Request:

```json
{
  "email": "teacher@example.com",
  "password": "Password123!",
  "rememberMe": false
}
```

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "665f1a2b3c4d5e6f78901234",
      "name": "Teacher Name",
      "email": "teacher@example.com",
      "role": "teacher",
      "className": "",
      "studentId": "",
      "isActive": true,
      "createdAt": "2026-11-24T10:00:00.000Z",
      "updatedAt": "2026-11-24T10:00:00.000Z"
    }
  }
}
```

Email matching is case-insensitive. Invalid credentials return `401 INVALID_CREDENTIALS`; deactivated accounts are rejected the same way.

#### `POST /api/auth/logout`

CSRF-protected. Clears the session cookie. Does not require a currently valid session, so it can also clear an expired login.

```json
{
  "data": {
    "loggedOut": true
  }
}
```

#### `GET /api/auth/me`

Requires authentication.

```json
{
  "data": {
    "user": {
      "id": "665f1a2b3c4d5e6f78901234",
      "name": "Teacher Name",
      "email": "teacher@example.com",
      "role": "teacher",
      "className": "",
      "studentId": "",
      "isActive": true,
      "createdAt": "2026-11-24T10:00:00.000Z",
      "updatedAt": "2026-11-24T10:00:00.000Z"
    }
  }
}
```

Returns `401` if the account was deleted, deactivated, or the password changed after login.

---

### 3.3 Users (Administrator only)

All routes below require `admin`.

#### `GET /api/users`

Query parameters:

| Name | Values | Description |
|---|---|---|
| `role` | `student`, `teacher` | Optional role filter |
| `search` | string | Case-insensitive name/email search |
| `includeAdmin` | `true`, `false` | Include admin accounts; defaults to excluding them |

Response:

```json
{
  "data": {
    "users": [
      {
        "id": "665f1a2b3c4d5e6f78901234",
        "name": "Alice Anderson",
        "email": "alice@example.com",
        "role": "student",
        "className": "B.Tech CSE-A",
        "studentId": "S-001",
        "isActive": true,
        "createdAt": "2026-11-24T10:00:00.000Z",
        "updatedAt": "2026-11-24T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### `POST /api/users`

Creates a student or teacher. Admin accounts cannot be created through the API.

```json
{
  "name": "Alice Anderson",
  "email": "alice@example.com",
  "password": "Password123!",
  "role": "student",
  "className": "B.Tech CSE-A",
  "studentId": "S-001"
}
```

Rules:

- `name`: 1–120 characters.
- `email`: valid, normalized to lowercase, unique.
- `password`: 6–128 characters.
- `role`: `student` or `teacher` only.
- `className`: optional, max 120 characters.
- `studentId`: optional, max 60 characters.

Duplicate email returns `409` with `"Email already exists."`

#### `GET /api/users/:id`

Returns `{ "data": { "user": { ... } } }`. Invalid ObjectIds return `400`.

#### `PATCH /api/users/:id`

Updates a student or teacher. All fields optional except the requirement that at least one field is supplied.

```json
{
  "name": "Alice A.",
  "email": "alice.new@example.com",
  "password": "NewPassword123!",
  "role": "student",
  "className": "B.Tech CSE-B",
  "studentId": "S-002",
  "isActive": true
}
```

Rules:

- `password: ""` is ignored; a non-empty password must be 6–128 characters.
- A non-empty password increments `tokenVersion` and invalidates existing sessions.
- Setting `isActive: false` invalidates existing sessions and blocks future login.
- Admin accounts cannot be modified through this endpoint (`403`).
- Changing a teacher to another role removes their assignments.
- Name/email changes synchronize display snapshots in assignments and reports.
- `role: "admin"` is rejected with `422`.

#### `DELETE /api/users/:id`

Deletes a student or teacher.

- Deleted user sessions are invalid immediately.
- Deleting a teacher removes their teacher assignments.
- **Historical reports are intentionally preserved** for both students and teachers.
- Admin accounts cannot be deleted through this endpoint (`403`).

```json
{
  "data": {
    "id": "665f1a2b3c4d5e6f78901234"
  }
}
```

---

### 3.4 Teacher assignments

`GET` is available to admins and teachers. `POST` and `DELETE` are administrator-only.

#### `GET /api/assignments`

- Admin: all assignments.
- Teacher: only their own assignments.
- Student: `403`.

```json
{
  "data": {
    "assignments": [
      {
        "id": "665f1a2b3c4d5e6f78901234",
        "teacherId": "665f1a2b3c4d5e6f78905678",
        "teacherEmail": "teacher@example.com",
        "teacherName": "Teacher Name",
        "className": "B.Tech CSE-A",
        "subject": "Data Structures",
        "createdAt": "2026-11-24T10:00:00.000Z",
        "updatedAt": "2026-11-24T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### `POST /api/assignments`

Administrator only.

```json
{
  "teacherId": "665f1a2b3c4d5e6f78905678",
  "className": "B.Tech CSE-A",
  "subject": "Data Structures"
}
```

Rules:

- The teacher account must exist, be active, and have role `teacher`.
- `className` and `subject` are trimmed, free-text strings (1–120 characters).
- Duplicate teacher + class + subject combinations are rejected case-insensitively with `409`.
- Teacher email/name are snapshotted into the assignment.

#### `DELETE /api/assignments/:id`

Administrator only. Removes the assignment. Existing reports remain.

---

### 3.5 Reports

There is **no report deletion endpoint**, matching the existing frontend functionality.

#### `GET /api/reports`

Authentication required. Results are automatically scoped by role:

| Role | Scope |
|---|---|
| Admin | All reports |
| Teacher | Reports they submitted |
| Student | Their own reports |

Query parameters:

| Name | Values | Description |
|---|---|---|
| `search` | string | Searches student name, student email, student ID and subject |
| `result` | `Pass`, `Fail` | Result filter |
| `className` | string | Exact class filter |
| `subject` | string | Exact subject filter |
| `limit` | 1–500 | Defaults to `500` |

Response reports are sorted newest first by `createdAt`.

```json
{
  "data": {
    "reports": [
      {
        "id": "665f1a2b3c4d5e6f78909999",
        "studentUserId": "665f1a2b3c4d5e6f78901234",
        "studentEmail": "alice@example.com",
        "studentName": "Alice Anderson",
        "studentId": "S-001",
        "className": "B.Tech CSE-A",
        "subject": "Data Structures",
        "testMarks": 32,
        "examMarks": 48,
        "marks": 80,
        "percentage": 80,
        "grade": "A",
        "result": "Pass",
        "attendance": 92,
        "attendanceStatus": "Present",
        "remarks": "Good progress",
        "teacherUserId": "665f1a2b3c4d5e6f78905678",
        "teacherEmail": "teacher@example.com",
        "teacherName": "Teacher Name",
        "date": "2026-11-24",
        "createdAt": "2026-11-24T10:00:00.000Z",
        "updatedAt": "2026-11-24T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

`count` is the total matching count before the `limit` is applied.

#### `GET /api/reports/:id`

Admin: any report. Teacher: only own reports. Student: only own reports.

Unauthorized ownership returns `404` to avoid revealing whether a report exists.

#### `POST /api/reports`

Teacher only.

```json
{
  "studentUserId": "665f1a2b3c4d5e6f78901234",
  "subject": "Data Structures",
  "testMarks": 32,
  "examMarks": 48,
  "attendance": 92,
  "attendanceStatus": "Present",
  "remarks": "Good progress"
}
```

Rules:

- `studentUserId` is the MongoDB user id of the student, not the academic `studentId`.
- The student must exist, be active, have role `student`, and have a non-empty `className`.
- The teacher must have an assignment matching the student’s class and the submitted subject (case-insensitive).
- `testMarks`: 0–40.
- `examMarks`: 0–60.
- `attendance`: 0–100.
- `attendanceStatus`: `Present`, `Late`, `Absent`.
- `remarks`: optional, max 2000 characters.
- The server ignores client-supplied `marks`, `grade` and `result` and computes them authoritatively from the current grading policy.
- Student name, email, academic student ID, class, teacher name and teacher email are snapshotted into the report.

`403` is returned when the teacher is not assigned to the student’s class and subject, the student has no class, or the role is not `teacher`.

#### `PATCH /api/reports/:id`

Teacher only, and only for a report they submitted.

```json
{
  "subject": "Data Structures",
  "testMarks": 35,
  "examMarks": 50,
  "attendance": 95,
  "attendanceStatus": "Late",
  "remarks": "Improved performance"
}
```

All fields are optional, but at least one is required. If the student or subject is changed, the teacher must be authorized for the resulting class and subject. Marks, grade, result and snapshots are recalculated on every update.

Another teacher’s report returns `404`.

---

### 3.6 Grading policy

#### `GET /api/settings`

Any authenticated role.

```json
{
  "data": {
    "gradingPolicy": {
      "passMark": 40,
      "grades": [
        { "label": "A+", "min": 90 },
        { "label": "A", "min": 80 },
        { "label": "B", "min": 70 },
        { "label": "C", "min": 60 },
        { "label": "D", "min": 50 },
        { "label": "F", "min": 0 }
      ],
      "updatedAt": "2026-11-24T10:00:00.000Z"
    }
  }
}
```

#### `PUT /api/settings`

Administrator only.

```json
{
  "passMark": 40,
  "grades": [
    { "label": "A+", "min": 90 },
    { "label": "A", "min": 80 },
    { "label": "B", "min": 70 },
    { "label": "C", "min": 60 },
    { "label": "D", "min": 50 },
    { "label": "F", "min": 0 }
  ]
}
```

Validation:

- `passMark`: 0–100.
- At least one grade is required.
- Labels are required, unique, and at most 20 characters.
- Thresholds are 0–100.
- After descending sort, each threshold must be strictly lower than the one above it.
- Invalid policies return `422 INVALID_GRADING_POLICY`.

**Historical-grade rule:** changing the policy does **not** update existing reports. Their stored `grade` and `result` remain unchanged. New reports and edited reports use the current policy.

---

### 3.7 Administrator dashboard

#### `GET /api/admin/overview`

Administrator only.

```json
{
  "data": {
    "overview": {
      "totalUsers": 6,
      "students": 3,
      "teachers": 2,
      "reports": 1,
      "assignments": 1,
      "classAverage": 80,
      "recentReports": []
    }
  }
}
```

`totalUsers` includes the administrator account, matching the existing dashboard. `recentReports` contains the five newest reports in the standard report shape.

---

### 3.8 Teacher dashboard

All routes require `teacher`.

#### `GET /api/teacher/overview`

```json
{
  "data": {
    "overview": {
      "assignments": [],
      "classes": ["B.Tech CSE-A"],
      "studentCount": 1,
      "reportCount": 1,
      "averageMarks": 80
    }
  }
}
```

Only students in the teacher’s assigned classes are counted. Classless students are excluded, fixing the previous frontend bug.

#### `GET /api/teacher/students`

Optional query: `className`.

```json
{
  "data": {
    "classes": ["B.Tech CSE-A"],
    "assignments": [],
    "students": []
  }
}
```

Requesting an unassigned class returns `403`.

#### `GET /api/teacher/roster`

Optional query: `className`. Same authorization rule as `/teacher/students`, plus the teacher’s latest report per student.

```json
{
  "data": {
    "classes": ["B.Tech CSE-A"],
    "assignments": [],
    "students": [
      {
        "id": "665...",
        "name": "Alice Anderson",
        "email": "alice@example.com",
        "role": "student",
        "className": "B.Tech CSE-A",
        "studentId": "S-001",
        "isActive": true,
        "latestReport": {},
        "latestGrade": "A",
        "latestAttendance": 92,
        "latestAttendanceStatus": "Present"
      }
    ]
  }
}
```

`latestReport` is `null` when the teacher has not submitted a report for that student.

---

### 3.9 Student dashboard

#### `GET /api/student/overview`

Student only.

```json
{
  "data": {
    "overview": {
      "profile": {},
      "stats": {
        "subjects": 1,
        "averageMarks": 80,
        "averageAttendance": 90,
        "passRate": 100,
        "overallGrade": "A",
        "gpa": "8.00"
      },
      "reports": [],
      "gradingPolicy": {}
    }
  }
}
```

The calculations match the existing student portal:

- `subjects` = number of reports.
- `averageMarks` = mean of report totals.
- `averageAttendance` = mean attendance.
- `passRate` = passed reports / total reports × 100.
- `overallGrade` = grade calculated from the average marks using the current policy.
- `gpa` = average marks / 10, formatted to two decimals.
- Empty reports return `overallGrade: "—"` and `gpa: "—"`.

---

## 4. Role access matrix

| Endpoint group | Admin | Teacher | Student | Anonymous |
|---|---|---|---|---|
| `GET /api/health` | Yes | Yes | Yes | Yes |
| `GET /api/auth/csrf` | Yes | Yes | Yes | Yes |
| `POST /api/auth/login` | Yes | Yes | Yes | Yes, with CSRF |
| `POST /api/auth/logout` | Yes | Yes | Yes | Yes, with CSRF |
| `GET /api/auth/me` | Yes | Yes | Yes | No |
| `/api/users/*` | Yes | No | No | No |
| `GET /api/assignments` | All | Own | No | No |
| `POST/DELETE /api/assignments` | Yes | No | No | No |
| `GET /api/reports` | All | Own | Own | No |
| `GET /api/reports/:id` | Any | Own | Own | No |
| `POST/PATCH /api/reports` | No | Yes | No | No |
| `GET /api/settings` | Yes | Yes | Yes | No |
| `PUT /api/settings` | Yes | No | No | No |
| `GET /api/admin/overview` | Yes | No | No | No |
| `/api/teacher/*` | No | Yes | No | No |
| `GET /api/student/overview` | No | No | Yes | No |

---

## 5. Data models

### User

```js
{
  _id,
  name,
  email,            // unique, lowercase
  passwordHash,     // never selected or returned by API
  role,             // admin | teacher | student
  className,        // free-text
  studentId,        // free-text academic identifier
  isActive,
  tokenVersion,     // session invalidation
  createdAt,
  updatedAt
}
```

### TeacherAssignment

```js
{
  _id,
  teacher,          // User ObjectId
  teacherEmail,
  teacherName,
  className,
  subject,
  createdAt,
  updatedAt
}
```

Unique index: `teacher + className + subject` with case-insensitive collation.

### Report

```js
{
  _id,
  student,          // User ObjectId
  studentEmail,
  studentName,
  studentId,        // academic identifier snapshot
  className,
  subject,
  testMarks,        // 0–40
  examMarks,        // 0–60
  marks,            // test + exam, server-computed
  percentage,       // same as marks, retained for frontend compatibility
  grade,            // server-computed
  result,           // Pass | Fail, server-computed
  attendance,       // 0–100
  attendanceStatus, // Present | Late | Absent
  remarks,
  teacher,          // User ObjectId
  teacherEmail,
  teacherName,
  date,
  createdAt,
  updatedAt
}
```

### GradingPolicy

Single document keyed by `default`:

```js
{
  key: "default",
  passMark,
  grades: [{ label, min }],
  updatedBy,
  createdAt,
  updatedAt
}
```

---

## 6. Local development

### 6.1 Environment file

Copy the template and fill it in manually:

```powershell
Copy-Item server\.env.example server\.env
```

Enter credentials only in:

`D:\Programs\Student_Report_System\server\.env`

Required variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Local listener port, default `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database name |
| `JWT_SECRET` | Random secret, at least 32 characters |
| `JWT_EXPIRES_IN` | Normal session lifetime, default `8h` |
| `JWT_REMEMBER_EXPIRES_IN` | Remember-me lifetime, default `30d` |
| `BCRYPT_ROUNDS` | Password hash cost, default `12` |
| `CLIENT_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `TRUST_PROXY` | `1` behind Vercel or another proxy, `0` when reached directly |
| `COOKIE_SECURE` | Optional override; defaults to `true` when `NODE_ENV=production` |
| `DNS_SERVERS` | Optional comma-separated resolver IPs for local environments where Node cannot read the system DNS configuration; leave unset on Vercel |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Login rate-limit window |
| `LOGIN_RATE_LIMIT_MAX` | Login attempts per window |
| `ADMIN_NAME` | Seeded administrator name |
| `ADMIN_EMAIL` | Seeded administrator email |
| `ADMIN_PASSWORD` | Seeded administrator password, minimum 12 characters |
| `ADMIN_RESET_PASSWORD` | Optional `true` to intentionally reset an existing seeded admin password |

`server/.env` is ignored by `.gitignore`. Never commit it.

### 6.2 Start the backend

```powershell
npm run server
```

Development with automatic restart:

```powershell
npm run server:dev
```

> On Windows PowerShell, `npm.ps1` may be blocked by the execution policy. In that case use `npm.cmd run server`, `npm.cmd run seed:admin`, and `npm.cmd run test:server`.

### 6.3 Seed the administrator

```powershell
npm run seed:admin
```

The seed is idempotent by email:

- Creates the admin if absent.
- If the admin exists, leaves the password unchanged by default.
- If `ADMIN_RESET_PASSWORD=true`, resets the password and invalidates existing sessions.
- Initializes the default grading policy.
- Never prints the password or hash.

### 6.4 Run backend tests

```powershell
npm run test:server
```

Tests use `mongodb-memory-server`, not Atlas, and do not touch production data.

### 6.5 Local DNS troubleshooting

If the backend reports `querySrv ECONNREFUSED` while the operating system can resolve the cluster, Node's c-ares resolver is not reading the system DNS configuration. Add a resolver override to `server/.env`:

```dotenv
DNS_SERVERS=1.1.1.1,8.8.8.8
```

This only affects the local backend process. Do not set `DNS_SERVERS` on Vercel.

---

## 7. MongoDB Atlas configuration

1. Create an Atlas cluster and database.
2. Create a dedicated database user with read/write access to the application database.
3. Add the deployment host to Atlas Network Access. Vercel serverless functions require Atlas to accept the deployment traffic; use an appropriate allowlist strategy rather than an unrestricted permanent rule where possible.
4. Copy the SRV connection string into `MONGODB_URI` in `server/.env` locally and into Vercel Environment Variables for deployment.
5. Set `MONGODB_DB_NAME` to the experimental database name.
6. Generate `JWT_SECRET` with a cryptographically secure random source and set it in both local and Vercel environments.
7. Run `npm run seed:admin` once with local or deployment environment variables.

No Atlas connection has been tested from this workspace because credentials are not present.

---

## 8. Vercel deployment layout

The backend is designed for the same Vercel project and domain as the React frontend.

```text
/
├── api/
│   └── index.js          # Vercel function; imports Express app
├── server/
│   └── src/
│       ├── app.js        # Express application, no listener
│       └── server.js     # Local listener only
├── src/                  # Existing React frontend, unchanged
├── dist/                 # Vite build output
├── vercel.json
└── package.json          # Shared dependencies for frontend + API
```

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" },
    { "source": "/:path*", "destination": "/" }
  ]
}
```

- The API rule comes first, so `/api/*` is routed to the single Express function and never to the SPA.
- The SPA catch-all only handles the remaining client-side routes.
- The Express app is created once per function instance and reused across warm invocations.
- The function entry normalizes the request path to `/api/*` before Express routing, so nested API paths are preserved.
- MongoDB connection reuse is handled by a module-level cached connection promise in `server/src/config/db.js`.

**Not tested:** this workspace has not been deployed to Vercel, has not created a Vercel project, and cannot confirm Atlas connectivity without credentials. The Vercel configuration is prepared but deployment verification remains pending.

---

## 9. Security notes

- bcrypt password hashing, cost from `BCRYPT_ROUNDS`.
- JWT signed with HS256 and verified with issuer/audience checks.
- HTTP-only session cookie.
- SameSite=Lax cookies.
- Secure cookies when `NODE_ENV=production`.
- Double-submit CSRF protection on all state-changing requests.
- Helmet security headers.
- CORS restricted to configured origins and same-origin requests.
- Login rate limiting.
- Server-side Zod validation for bodies and queries.
- Mongoose schema validation and indexes.
- Role and ownership authorization on every protected resource.
- Teacher access restricted to assigned class/subject combinations.
- No password or hash in any API response.
- Session invalidation through deletion, deactivation, password reset, and token versioning.
- Historical reports preserved when users are deleted.
- Historical report grades preserved when grading policies change.
- No public signup and no report deletion endpoint.

**Serverless limitation:** the default rate limiter uses in-memory storage and is per function instance. For strict multi-instance rate limiting, a shared store such as Upstash Redis would be required in a future phase.
