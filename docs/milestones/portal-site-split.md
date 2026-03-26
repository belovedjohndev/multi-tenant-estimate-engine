# Portal-Site Split

This milestone separates the authenticated client experience from the public demo host.

## What Changed

- Added a new `portal-site/` frontend app for client-only workflows.
- Moved login, dashboard, lead list, client settings, pricing config editing, config version history, and logout into `portal-site`.
- Reduced `demo-site/` to a public-only widget demo and showcase surface.
- Kept all backend API contracts unchanged so the split is a frontend architecture change only.

## Frontend Responsibilities

- `demo-site/`
  Public estimator demo
  Public sample widget host
  Marketing/showcase surface

- `portal-site/`
  Login
  Dashboard
  Lead list
  Client settings
  Pricing config editor
  Config version history
  Logout

## Auth Note

The portal still uses bearer tokens today, but token persistence now lives behind a dedicated `authSession.ts` module and uses `sessionStorage` rather than `localStorage`.

That keeps the current backend contract intact while creating a cleaner seam for a later move to HttpOnly cookie auth.

## Smoke Test

1. Start `demo-site` and confirm only public estimator content is shown.
2. Submit an estimate and lead through the widget.
3. Start `portal-site` and sign in with a client user.
4. Confirm the new lead appears in the portal dashboard.
5. Confirm client settings, pricing JSON editing, and config history render correctly.
6. Sign out and confirm the portal returns to the login screen.
