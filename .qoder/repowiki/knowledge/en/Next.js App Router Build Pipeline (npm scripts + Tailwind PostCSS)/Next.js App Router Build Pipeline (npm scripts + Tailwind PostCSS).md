---
kind: build_system
name: Next.js App Router Build Pipeline (npm scripts + Tailwind PostCSS)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.mjs
    - postcss.config.mjs
    - jsconfig.json
    - .gitignore
---

## What system/approach is used
The project is a single Next.js application (App Router) built with the standard npm toolchain. There are no Makefiles, Dockerfiles, CI pipelines, or custom build scripts — the entire build and deployment surface is defined in `package.json` scripts that delegate to `next build`, `next dev`, and `next start`. Styling is processed via Tailwind CSS v4 through `@tailwindcss/postcss` configured in `postcss.config.mjs`.

## Key files and packages
- `package.json` — declares dependencies (`next 16.1.0`, `react 19.2.3`, `@supabase/supabase-js`, `bootstrap`, `react-bootstrap`, `compromise`, `nodemailer`, `react-toastify`) and four npm scripts: `dev`, `build`, `start`, `lint`. An `overrides` block pins `react` and `react-dom` to `19.2.3` to resolve version conflicts.
- `next.config.mjs` — sets `reactStrictMode: true`, exposes Supabase/portal/admin URLs as `NEXT_PUBLIC_*` environment variables at build time, and whitelists remote image hosts for the `images` loader (Supabase storage bucket and localhost).
- `postcss.config.mjs` — registers `@tailwindcss/postcss` as the only PostCSS plugin; Tailwind is consumed via the new v4 import style rather than a `tailwind.config.js` file.
- `jsconfig.json` — enables path aliases so imports can use the `@/*` prefix mapped to the repository root.
- `.gitignore` — excludes `/node_modules`, `/next`, `/out`, `/build`, `.env*.local`, `.vercel`, and generated `next-env.d.ts`, indicating the expected build artifacts and local-only env files.
- `.env.local` — present in the working tree and holds runtime secrets (Supabase URL/key, portal/admin URLs); it is ignored from version control per `.gitignore`.

## Architecture and conventions
- **Single-package monorepo**: despite being described as a monorepo hosting both a marketing site and an exam portal, there is only one `package.json` and one Next.js app under `app/`; the exam portal code lives alongside the marketing pages inside the same source tree (`src/pages_components/`, `src/utils/`).
- **Build-time env injection**: all client-facing configuration is funneled through `next.config.mjs`'s `env` block, which re-exposes `process.env.*` values as `NEXT_PUBLIC_*` variables baked into the static bundle during `next build`. Secrets such as Supabase keys are expected to be provided via `.env.local` (or equivalent host env) and must never be committed.
- **Remote asset policy**: the `images.remotePatterns` config restricts optimized image fetching to the project's Supabase storage domain and localhost, preventing arbitrary remote images from being proxied.
- **Styling pipeline**: Tailwind v4 is wired through PostCSS; there is no `tailwind.config.js`, so customization is expected to come from CSS imports and the PostCSS plugin configuration.
- **Path aliasing**: the `@/*` alias in `jsconfig.json` lets components import from the repo root without relative paths, keeping imports flat across `app/`, `components/`, `lib/`, and `src/`.

## Conventions and constraints
- **No custom build orchestration**: development, production builds, and serving are exclusively done via `npm run dev`, `npm run build`, and `npm run start`. No Makefile, shell script, or container definition exists in the repo.
- **Artifacts are ignored**: `/node_modules`, `/next`, `/out`, `/build`, and `next-env.d.ts` are gitignored, meaning the repo ships only source plus `package-lock.json`; consumers must install deps and run the build locally or on a platform that executes `next build`.
- **Environment variables are required at build time**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STUDENT_PORTAL_URL`, and `NEXT_PUBLIC_ADMIN_URL` must be available when running `next build`, otherwise the generated bundle will reference undefined values.
- **Platform hints**: `.vercel` is listed in `.gitignore`, suggesting Vercel as a likely deployment target, but no Vercel-specific config (e.g., `vercel.json`) is present in the repository.
- **Linting**: `npm run lint` invokes `next lint`; no ESLint config file was found in the snapshot, so defaults or inherited rules apply.