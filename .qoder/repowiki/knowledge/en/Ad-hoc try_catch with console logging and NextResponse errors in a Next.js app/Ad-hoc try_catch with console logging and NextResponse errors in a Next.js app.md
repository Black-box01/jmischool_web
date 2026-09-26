---
kind: error_handling
name: Ad-hoc try/catch with console logging and NextResponse errors in a Next.js app
category: error_handling
scope:
    - '**'
source_files:
    - app/api/notify/route.js
    - lib/enquiry.js
    - src/pages_components/CompletionExam.jsx
    - src/api/emailNotificationService.js
    - components/News.jsx
---

## What system/approach is used

The codebase has no centralized error-handling framework, custom error classes, or shared middleware. Errors are handled locally with plain `try`/`catch` blocks, `console.error` for logging, and — for server routes — `NextResponse.json(...)` with explicit HTTP status codes. User-facing feedback on the client side uses `react-toastify` toasts rather than thrown exceptions.

There is no `errors/` directory, no sentinel/error-code constants, no global error boundary, and no `panic`/`recover` equivalent (this is JavaScript/React). The only structured error surface is the `/api/notify` route, which returns typed JSON payloads with status codes.

## Key files and packages

- **`app/api/notify/route.js`** — The only route that consistently validates input (`subject`, `message`) and returns `NextResponse.json` with 400/500 status codes. It wraps SMTP sending in `try`/`catch` and logs via `console.error`. It also reads admin email from Supabase with its own per-call `try`/`catch` returning `null` on failure.
- **`lib/enquiry.js`** — Client-side Supabase calls. On DB insert errors it `throw[s] new Error("Could not send your message right now...")` / `"Could not submit the application right now..."` so callers can display a user-friendly message. Email notifications are fire-and-forget: the inner `notifySchool` function catches and swallows errors (`console.error`), explicitly documented as never blocking the visitor because the DB row is the source of truth.
- **`src/pages_components/CompletionExam.jsx`** — Exam flow uses `toast.error` / `toast.success` / `toast.warning` for all user feedback. Network/localStorage failures are caught and logged; missing questions show an inline message. Result upload failures fall back to keeping data in `localStorage` and showing a warning toast.
- **`src/api/emailNotificationService.js`** — A service module that returns `{ success, messageId }` / `{ success: false, error, details }` objects instead of throwing. Callers must check `response.ok`; network errors are caught and returned as `{ success: false, error: error.message }`. This file is currently unused by the active exam flow (which calls Supabase directly) but demonstrates the preferred return-object pattern for non-fatal operations.
- **`components/News.jsx`** — Uses `.catch(() => !cancelled && setItems([]))` to silently ignore fetch failures when the component is unmounted.

## Architecture and conventions

1. **Server routes validate and respond with status codes.** The `/api/notify` POST checks required fields and environment configuration before doing work, returning 400 for bad input and 500 for misconfiguration or transport failures. There is no central error formatter — each route constructs its own JSON shape.
2. **Client-side I/O uses try/catch + toast.** In React components, async failures are caught inside the effect/handler and surfaced via `react-toastify` toasts. No global error boundary exists to catch render-time errors.
3. **Non-critical side effects are fire-and-forget.** `notifySchool` in `lib/enquiry.js` wraps the email call in `try`/`catch` and deliberately ignores failures so that a broken email service cannot block form submission. The comment explicitly states this design choice: "Never throws — a failed email must not block the visitor; the DB row is already the source of truth."
4. **Supabase calls propagate their `.error` field.** Most Supabase calls destructure `{ data, error }` and either throw (for fatal DB writes like enquiry/application inserts) or treat `error` as a boolean failure flag (e.g. `return !error` in `saveResultToDatabase`).
5. **No custom error types.** All thrown errors are plain `Error` instances with human-readable messages intended for the UI layer. There are no domain-specific error classes or error-code enums.
6. **Environment-missing configuration is treated as a runtime error.** Missing `GMAIL_USER` / `GMAIL_APP_PASSWORD` causes the notify route to return a 500 with a descriptive message rather than failing silently.

## Conventions and constraints observed

- Every async operation that can fail is wrapped in `try`/`catch`; bare `await` without a handler is not used for external calls.
- Server routes use `NextResponse.json({ error: ... }, { status })` rather than throwing unhandled exceptions.
- Client components prefer `react-toastify` over `alert()` or thrown errors for user feedback.
- Fire-and-forget operations (email notifications) swallow errors and log them; they never rethrow.
- Fatal operations (DB inserts for enquiries/applications) throw a user-facing `Error` after logging, letting the caller decide how to present it.
- Supabase queries that are optional (e.g. fetching admin email, settings) catch errors and return `null` rather than propagating exceptions.
- There is no repository-wide rule enforced by linting or tests; these patterns are consistent by convention across the small codebase.