---
kind: dependency_management
name: npm-based Dependency Management with Lockfile and Overrides
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - .env.local
---

## System / Approach

This repository uses **npm** as its package manager for a single Next.js project (the monorepo is organized by directory, not by npm workspaces). Dependencies are declared in `package.json` and pinned reproducibly via `package-lock.json` (lockfileVersion 3). There is no vendoring of JS dependencies — all packages are installed into the root `node_modules/` directory.

## Key Files

- `package.json` — declares runtime dependencies (`next`, `react`, `@supabase/supabase-js`, `bootstrap`, `compromise`, `nodemailer`, `react-bootstrap`, `react-icons`, `react-toastify`) and dev dependencies (`@tailwindcss/postcss`, `postcss`, `tailwindcss`, plus typescript and `@types/nodemailer`).
- `package-lock.json` — full lockfile that pins every transitive dependency to an exact version and integrity hash from the public npm registry (`https://registry.npmjs.org/...`).
- `.env.local` — holds environment secrets (Supabase keys, Nodemailer credentials); not committed to version control per `.gitignore`.
- `next.config.mjs` / `postcss.config.mjs` — configuration files that reference these dependencies at build time.

## Architecture and Conventions

- **Single-package layout**: despite being called a "monorepo", there is only one `package.json` at the repository root; subdirectories (`app/`, `components/`, `lib/`, `src/`) share the same dependency graph. There are no workspace definitions or per-subproject manifests.
- **Dependency ranges**: most dependencies use caret (`^`) ranges (e.g. `"^2.89.0"`, `"^5.3.8"`, `"^14.15.0"`, `"^7.0.11"`, `"^11.0.5"`, `"^4.1.0"`), allowing minor/patch upgrades within the specified major version. A few are pinned exactly (e.g. `"next": "16.1.0"`, `"react": "19.2.3"`, `"react-dom": "19.2.3"`).
- **React version override**: the `overrides` field forces `react` and `react-dom` to `19.2.3` across the entire dependency tree, ensuring all packages resolve to the same React version even if they request different ranges.
- **No private registry or scoped packages**: all packages are resolved from the default public npm registry; no `.npmrc`, `yarn.lock`, `pnpm-lock.yaml`, or custom registry configuration was found.
- **Environment isolation**: secrets (Supabase URL/keys, email credentials) live in `.env.local`, which is gitignored, so runtime configuration is kept separate from dependency declarations.

## Constraints and Rules Observed

- The lockfile (`package-lock.json`) is committed alongside `package.json`, so reproducible installs rely on checking out both files together.
- Runtime and build tooling are split cleanly: UI/runtime libraries go under `dependencies`; styling/build tooling (`tailwindcss`, `postcss`, `@tailwindcss/postcss`) goes under `devDependencies`.
- No vendored third-party JavaScript exists outside `node_modules/`; CSS frameworks (Bootstrap, Tailwind) are consumed as npm packages rather than copied source.
- There is no automated dependency update tooling (no Dependabot, Renovate, etc.) visible in this snapshot; updates would be performed manually by editing `package.json` and regenerating the lockfile.