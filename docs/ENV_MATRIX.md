# Environment Matrix

Status: current runtime values are listed first. Billing provider integration is not active in the current MVP.

## Production URLs

```text
DEMO_BASE_URL=https://demo.belovedjohndev.com
PORTAL_BASE_URL=https://portal.belovedjohndev.com
API_BASE_URL=https://your-render-api.onrender.com
```

The separate service website at `https://belovedjohndev.com` is not part of this repository.

## Backend: Render

Required:

```text
DATABASE_URL=
WIDGET_ORIGIN=https://demo.belovedjohndev.com
PORTAL_ORIGIN=https://portal.belovedjohndev.com
```

Recommended:

```text
NODE_ENV=production
PORT=
PGSSLMODE=require
CLIENT_PORTAL_SESSION_TTL_HOURS=168
CLIENT_PORTAL_COOKIE_SECURE=true
CLIENT_PORTAL_COOKIE_SAME_SITE=lax
CLIENT_PORTAL_COOKIE_NAME=estimate_engine_portal_session
RESEND_API_KEY=
LEAD_NOTIFICATION_FROM_EMAIL=
LEAD_NOTIFICATION_TIMEOUT_MS=5000
```

Demo reset controls:

```text
CLIENT_PORTAL_DEMO_RESET_CLIENT_ID=demo
CLIENT_PORTAL_DEMO_RESET_COMPANY_NAME=
CLIENT_PORTAL_DEMO_RESET_PHONE=
CLIENT_PORTAL_DEMO_RESET_NOTIFICATION_EMAIL=
CLIENT_PORTAL_DEMO_RESET_LOGO_URL=
CLIENT_PORTAL_DEMO_RESET_ESTIMATOR_CONFIG=
```

## Demo Site: Vercel

Required:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

Optional:

```text
VITE_CLIENT_ID=demo
VITE_LAUNCHER_LABEL=Try The Live Widget
VITE_MODAL_TITLE=Estimate Engine Demo
VITE_COMPANY_NAME=Estimate Engine
VITE_LOGO_URL=/brand/widget-demo-logo.png
VITE_PRIMARY_COLOR=#0f3554
VITE_SECONDARY_COLOR=#2ea8ff
VITE_PORTAL_URL=https://portal.belovedjohndev.com
```

## Portal Site: Vercel

Required:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
```

Optional:

```text
VITE_DEFAULT_CLIENT_ID=demo
VITE_PORTAL_TITLE=Estimate Engine Client Portal
VITE_DEMO_ACCESS_EMAIL=
VITE_DEMO_ACCESS_PASSWORD=
```

## Widget

The widget does not read environment variables at runtime. The host page passes runtime config into `mountWidget(container, config)`.

Required runtime config:

```text
apiBaseUrl
clientId
```

Optional runtime config:

```text
launcherLabel
modalTitle
companyName
phone
logoUrl
primaryColor
secondaryColor
```

## Planned Only

Paddle and PayPal environment variables are planned only and are not used by the current runtime. Do not configure checkout, webhook, or billing enforcement variables for the current MVP.
