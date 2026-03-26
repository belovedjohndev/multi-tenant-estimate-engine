# HttpOnly Cookie Auth

This milestone migrates the client portal from browser-stored bearer tokens to server-managed session cookies.

## What Changed

- `POST /auth/login` now validates credentials, creates a server-side session, and sets an HttpOnly cookie.
- `POST /auth/logout` now revokes the server-side session and clears the cookie.
- `GET /auth/me` now reads the session from the cookie and acts as the source of truth for frontend auth state.
- `portal-site` no longer stores auth tokens in `localStorage` or `sessionStorage`.
- Portal API calls now use `fetch(..., { credentials: "include" })`.
- Backend CORS now allows credentialed requests from the configured `PORTAL_ORIGIN`.

## Security Model

- Session persistence stays server-side in `client_sessions`.
- The browser only receives a session cookie, not a reusable bearer token for JavaScript to store.
- Tenant isolation remains unchanged because authenticated portal routes still resolve the tenant from the server-side session context.

## Local vs Production

Local development:

- `CLIENT_PORTAL_COOKIE_SECURE=false`
- `CLIENT_PORTAL_COOKIE_SAME_SITE=lax`
- `PORTAL_ORIGIN=http://localhost:4174`

Production:

- `CLIENT_PORTAL_COOKIE_SECURE=true`
- `CLIENT_PORTAL_COOKIE_SAME_SITE=lax` if backend and portal share the same site
- `CLIENT_PORTAL_COOKIE_SAME_SITE=none` if backend and portal are deployed on different sites and need credentialed cross-origin requests
- `PORTAL_ORIGIN` must exactly match the deployed portal origin

## Smoke Test

1. Start the backend with `WIDGET_ORIGIN` and `PORTAL_ORIGIN` configured.
2. Start `portal-site` and sign in with a client user.
3. Confirm login succeeds without any token being written into browser storage.
4. Refresh the page and confirm the portal restores from `GET /auth/me`.
5. Open the network tab and confirm portal API calls are sent with cookies, not bearer headers.
6. Sign out and confirm the next `GET /auth/me` request returns an unauthenticated response.
