# Deployment preparation

No deployment has been performed. The original `vercel.json` SPA fallback is unchanged.

## Backend

Use a Node.js host supporting a persistent Node process, outbound MongoDB Atlas access, HTTPS, and environment secrets. Use Node 24 LTS, set the service root to `backend`, install with `npm ci --omit=dev`, and start with `npm start`. Development-only MongoDB/Playwright tools are not production dependencies.

Configure `NODE_ENV=production`, the platform-provided `PORT`, a private random `JWT_SECRET`, MongoDB credentials, and `FRONTEND_URL` as the exact HTTPS frontend origin. Comma-separated exact origins are accepted; do not use wildcards. Keep `DNS_SERVERS` absent or blank unless that host specifically needs an override. Atlas must allow the host's egress addresses and the database user must have the required access to `student_report_system`.

`TRUST_PROXY` defaults to 0. Set it to the verified number of trusted proxy hops for your topology, and ensure clients cannot reach a shorter untrusted path. Do not blindly trust client forwarding headers. Login limits and general API limits use per-process memory; run one API instance until a shared rate-limit store is configured for horizontal scaling.

Use `/api/health` for process liveness and `/api/ready` for database readiness. Startup waits for MongoDB. SIGINT/SIGTERM close HTTP and database connections. Logs intentionally omit credentials, bodies and raw database errors. Startup reports sanitized DNS, network and authentication failure categories.

## Vercel frontend: recommended same-origin API proxy

Set project root to the workspace root, install with `npm ci`, build with `npm run build`, output `dist`, and set `VITE_API_BASE_URL=/api`. Before deployment, replace `YOUR_BACKEND_HOST` below and add the API rewrite **before** the existing SPA fallback:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR_BACKEND_HOST/api/:path*" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

The supplied file remains unchanged because the deployment hostname has not been selected. Without this rule, production `/api` calls would hit the SPA fallback. Preserve the fallback so refreshing `/admin`, `/teacher`, or `/student` works. API responses must not be cached. Configure the backend's `FRONTEND_URL` to the Vercel/custom frontend origin; forwarded browser Origin must be preserved.

Vercel supports external-origin proxy rewrites: [official rewrite documentation](https://vercel.com/docs/routing/rewrites). The frontend sends cookies with requests and retains the CSRF token only in memory. With this setup use `COOKIE_SAME_SITE=lax`. Production cookies use the `__Host-` prefix, Secure, HttpOnly, Path=/ and no Domain.

## Direct API domain alternative

Set `VITE_API_BASE_URL=https://YOUR_API_HOST/api` and allow the frontend's exact origin on the backend. Separate HTTPS subdomains under the same site can use SameSite=Lax. Truly cross-site hosting needs `COOKIE_SAME_SITE=none`, HTTPS, and browser support for third-party cookies; some browsers block these cookies. The same-origin proxy avoids that dependency. Never put JWT or MongoDB secrets in `VITE_` variables.

## Release verification

After you approve and perform deployment, verify readiness; provision the first administrator privately; log in from independent browsers; create a class, subject, accounts and assignment; save/update a report; confirm Student and Admin refresh; test unauthorized access, logout and a direct route refresh. Verify the production cookie flags, CORS origin, print preview, and behavior after backend restart. Physical-device and hosted-network testing remain pending.
