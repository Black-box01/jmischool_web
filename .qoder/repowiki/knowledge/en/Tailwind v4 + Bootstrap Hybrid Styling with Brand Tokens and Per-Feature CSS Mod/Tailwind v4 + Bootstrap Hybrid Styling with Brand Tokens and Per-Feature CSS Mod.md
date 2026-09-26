---
kind: frontend_style
name: Tailwind v4 + Bootstrap Hybrid Styling with Brand Tokens and Per-Feature CSS Modules
category: frontend_style
scope:
    - '**'
source_files:
    - app/globals.css
    - postcss.config.mjs
    - package.json
    - next.config.mjs
    - components/Navbar.jsx
    - components/Hero.jsx
    - src/styles/QuizComponent.css
    - src/styles/QuizHome.css
    - src/styles/DetailedResults.css
---

## What system/approach is used

The JMIS monorepo uses a **hybrid styling approach** combining two systems:

1. **Tailwind CSS v4 (utility-first)** for the marketing site under `app/` — configured via `postcss.config.mjs` with `@tailwindcss/postcss`, imported through `@import "tailwindcss"` in `app/globals.css`. Design tokens are declared with Tailwind v4's `@theme` block: brand colors (`--color-brand: #1e5128`, `--color-brand-light: #4e9f38`, `--color-brand-soft: #eaf4e8`), gold accent (`--color-gold: #f6a623`), and display font (`--font-display`). A shared `.brand-gradient` class provides the green gradient used across the platform.
2. **Bootstrap 5 + React-Bootstrap** for the CBT exam portal under `src/pages_components/` — imported directly by those components and styled with per-feature CSS modules in `src/styles/` (`QuizComponent.css`, `QuizHome.css`, `DetailedResults.css`).

There is no single design token system bridging both; the marketing side owns its tokens in `globals.css`, while the CBT portal relies on Bootstrap's defaults plus custom CSS.

## Key files and packages

- `package.json` — declares `next`, `react` 19, `bootstrap` 5.3.8, `react-bootstrap` 2.10.10, `tailwindcss` 4.1.0, `@tailwindcss/postcss` 4.1.0, `react-icons`, `react-toastify`.
- `postcss.config.mjs` — only plugin is `@tailwindcss/postcss`; no other PostCSS transforms.
- `app/globals.css` — single source of global styles: Tailwind import, `@theme` tokens, `html` smooth scroll, `body` defaults, `.brand-gradient`, `.section-title` / `.section-sub` reusable section classes, and a specificity override to suppress Bootstrap's global `a { text-decoration: underline }` inside `<header>`.
- `components/*.jsx` — marketing UI built entirely with Tailwind utility classes (e.g. `Navbar.jsx` uses `sticky top-0 z-50 backdrop-blur bg-white/85 border-b border-gray-100`, `text-brand`, `hover:text-brand-light`, `brand-gradient`).
- `src/styles/QuizComponent.css`, `QuizHome.css`, `DetailedResults.css` — feature-scoped CSS modules for the CBT portal, each paired with a component in `src/pages_components/`.
- `next.config.mjs` — configures `images.remotePatterns` for Supabase image URLs consumed by the marketing site.

## Architecture and conventions

- **Marketing site (`app/`)**: All visual presentation lives in JSX via Tailwind utilities. Global tokens live in `app/globals.css` and are referenced as `text-brand`, `bg-brand-soft`, `brand-gradient`, etc. Section headings use the shared `.section-title` / `.section-sub` classes defined there. The layout is responsive using Tailwind's `md:` breakpoints.
- **CBT portal (`src/`)**: Each page/component imports its own CSS module (e.g. `./styles/QuizComponent.css`) scoped to that feature. Styles are conventional BEM-like class names (`.cbtNavbar`, `.quiz-info`, `.answer-section button.selected`, `.score-modal`, `.detailed-results-modal`). Responsive behavior is handled with `@media screen and (max-width: 768px)` blocks rather than utility classes.
- **Dark mode**: Implemented exclusively for the CBT portal via an `html[data-theme="dark"]` attribute selector in `QuizHome.css` and related files, overriding Bootstrap and default colors with `!important` rules. This is separate from the marketing site, which has no dark-mode support.
- **Print output**: `DetailedResults.css` includes a full `@media print` block that hides interactive elements, forces A4 page sizing, and ensures color fidelity with `-webkit-print-color-adjust: exact`.
- **Cross-system conflict resolution**: `app/globals.css` explicitly overrides Bootstrap's global link styles (`header a, header a:hover, header a:focus { text-decoration: none }`) because the CBT portal's Bootstrap import would otherwise underline navbar links after client-side navigation.

## Conventions and constraints

- **Brand palette is centralized in `app/globals.css`** via Tailwind v4 `@theme` variables; marketing components consume them through `text-brand`, `text-brand-light`, `bg-brand-soft`, and the `.brand-gradient` utility. New brand colors should be added to this `@theme` block.
- **Marketing components must not write raw CSS** — they use Tailwind utility classes exclusively (observed across all `components/*.jsx`).
- **CBT features isolate their styles** in dedicated files under `src/styles/` named after the feature (one CSS file per component/page pair).
- **Responsive strategy differs by area**: marketing uses Tailwind's `md:` breakpoint utilities; CBT uses traditional `@media screen and (max-width: 768px)` queries.
- **Bootstrap is treated as a base layer only** for the CBT portal; all custom styling goes into the project's own CSS modules, never via inline styles or Bootstrap theme overrides.
- **External images** are served from Supabase and whitelisted in `next.config.mjs` `images.remotePatterns`; marketing pages reference them via plain `<img>` tags rather than Next.js `Image` to avoid width juggling.
- **Accessibility**: Navbar uses `aria-haspopup`, `aria-expanded`, and `aria-label` attributes; focus outlines are preserved in the detailed results modal.