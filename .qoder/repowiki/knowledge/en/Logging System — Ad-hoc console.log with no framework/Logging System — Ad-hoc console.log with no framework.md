---
kind: logging_system
name: Logging System — Ad-hoc console.log with no framework
category: logging_system
scope:
    - '**'
source_files:
    - app/api/notify/route.js
    - lib/enquiry.js
    - src/api/emailNotificationService.js
---

## What system/approach is used

The repository has **no logging framework** and **no centralized logger**. All diagnostic output goes through the built-in Node.js `console` API (`console.log`, `console.error`, `console.warn`). There is no Winston, Pino, Bunyan, log4js, debug, morgan, consola, signale, or any other logging library imported anywhere in the codebase. The only reference to a logging tool is `.gitignore` line 7 ignoring `npm-debug.log*` (an npm artifact, not application logging).

## Key files and packages

- `app/api/notify/route.js` — Next.js App Router API route for sending email notifications; uses `console.log` / `console.error` with emoji-prefixed tags like `[notify]`, `✅`, `❌`.
- `lib/enquiry.js` — Supabase-backed enquiry/application helpers; logs failures via `console.error`.
- `src/api/emailNotificationService.js` — Alternative email notification service (appears to be a parallel implementation); uses `console.log` / `console.warn` / `console.error` with emoji prefixes (`📧`, `📨`, `⚠️`, `❌`).

No dedicated `log/`, `logging/`, or `logger.*` module exists.

## Architecture and conventions

- **Ad-hoc per-call logging**: Each file that needs diagnostics calls `console.log` / `console.error` directly at the point of interest. There is no shared logger instance, no log-level configuration, and no sink abstraction.
- **Tagging convention**: Messages are prefixed with contextual tags so they can be grepped in raw stdout:
  - `[notify]` in `app/api/notify/route.js`
  - Emoji markers: `✅`, `❌`, `📧`, `📨`, `⚠️` across both email services.
- **Message shape**: Plain strings, sometimes concatenated with values (e.g. `info.messageId`, recipient arrays). No structured JSON payloads, no timestamp fields, no request IDs, no correlation IDs.
- **Levels used**: Only three levels appear — `console.log` (success/informational), `console.error` (failures/errors), and one `console.warn` call for missing recipients config.
- **Sinks**: Output goes to the default Node.js process stdout/stderr. There is no file rotation, no external collector, no environment-based level filtering.

## Conventions and constraints

Observed conventions (descriptive):
- Error paths use `console.error`; success/diagnostic paths use `console.log`.
- Contextual tags (emoji or bracketed names) prefix messages for readability in terminal output.
- Configuration-related warnings use `console.warn` (e.g. "No email recipients configured in jmis_settings").

Rules enforced by the codebase:
- None. There is no lint rule, no logger wrapper, and no framework enforcing a particular style. Any file can emit `console.*` calls without restriction.
- The absence of any logging dependency in `package.json` means adding a structured logger would require an explicit dependency change.