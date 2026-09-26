---
kind: configuration_system
name: Next.js Environment Variables and Runtime Configuration
category: configuration_system
scope:
    - '**'
source_files:
    - next.config.mjs
    - lib/supabaseClient.js
    - src/supabaseClient.js
    - app/api/notify/route.js
    - lib/useSettings.js
---

## Overview

The project uses Next.js's built-in environment variable system with no dedicated configuration library. Configuration is split across two layers:

1. **Build-time env vars** — declared in `next.config.mjs` under the `env` field, which are injected into the client bundle.
2. **Server-only env vars** — read directly via `process.env` in server-side code (API routes).

There is no `.env` file committed to the repo; secrets and runtime values are expected to be provided by the deployment environment.

## Key Files

- `next.config.mjs` — central declaration of all client-exposed env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STUDENT_PORTAL_URL`, `NEXT_PUBLIC_ADMIN_URL`) plus image remote host allowlist.
- `lib/supabaseClient.js` — shared Supabase client for the marketing site; reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `src/supabaseClient.js` — duplicate Supabase client for the CBT exam portal (same pattern).
- `app/api/notify/route.js` — server-only API route reading `GMAIL_USER` and `GMAIL_APP_PASSWORD` for email notifications.
- `lib/useSettings.js` — React hook that fetches runtime content from the `jmis_settings` Supabase row (the "feature flag" equivalent: admin-managed content driving UI sections).

## Architecture & Conventions

### Client-visible configuration
All variables intended for the browser must be prefixed with `NEXT_PUBLIC_` and explicitly re-exported through `next.config.mjs`'s `env` block. Consumers access them as `process.env.NEXT_PUBLIC_*` inside components/hooks (e.g. `components/Footer.jsx`, `components/Hero.jsx`, `components/Navbar.jsx`).

### Server-only configuration
Secrets used only on the server (Gmail credentials) are read directly from `process.env.GMAIL_USER` / `process.env.GMAIL_APP_PASSWORD` inside `app/api/notify/route.js`. There is no validation or defaulting beyond a guard that checks both are present before sending mail.

### Supabase connection
Both the marketing site (`lib/supabaseClient.js`) and the exam portal (`src/supabaseClient.js`) instantiate a single Supabase client using the same pair of env vars. The marketing-site client additionally exposes a helper `settingFileUrl(file)` that builds public storage URLs against the configured Supabase URL.

### Content-driven settings
Runtime application content (hero text, gallery, facilities, etc.) is not stored in config files but fetched at runtime from a single `jmis_settings` row in Supabase via the `useSettings()` hook. This is the repository's de facto feature-flag/content-management mechanism.

## Conventions and Constraints

- **Convention**: Any env var consumed on the client side must be listed in `next.config.mjs` under `env:` with the `NEXT_PUBLIC_` prefix; otherwise it will not be available in the browser bundle.
- **Convention**: Supabase clients are created once per package (`lib/supabaseClient.js`, `src/supabaseClient.js`) and re-exported rather than instantiated inline.
- **Convention**: Marketing pages read their content through `useSettings()`, which queries `supabase.from("jmis_settings").select("*").limit(1)` — there is no local JSON/YAML config for page content.
- **Constraint**: The `images.remotePatterns` in `next.config.mjs` hardcodes `btnatydmfunhwgoeguus.supabase.co` as an allowed remote image host; images from other hosts will be rejected by Next.js's image optimization.
- **Constraint**: Email notification requires both `GMAIL_USER` and `GMAIL_APP_PASSWORD`; the route returns early if either is missing (`if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)`).
- **Observation**: `Navbar.jsx` references `NEXT_PUBLIC_STAFF_PORTAL_URL` without it being declared in `next.config.mjs`, so it would fall back to its hardcoded defaults (`https://staff.jmischool.com`) unless the deployment provides it as a raw process env var.
- **Observation**: There is no `.env` file in the repository; environment values are expected to be supplied externally (e.g., platform-provided environment variables).