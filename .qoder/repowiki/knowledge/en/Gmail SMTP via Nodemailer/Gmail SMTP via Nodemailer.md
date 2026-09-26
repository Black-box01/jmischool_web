---
kind: external_dependency
name: Gmail SMTP via Nodemailer
slug: gmail-smtp-nodemailer
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
source_files:
    - app/api/notify/route.js
---

### Gmail SMTP (via Nodemailer)
- Role: Outbound email delivery for admissions applications and contact enquiries sent from the website's Next.js API route.
- Integration point: `app/api/notify/route.js` POST handler builds a de-duplicated recipient list (caller-provided + `jmis_settings.adminEmail`) and sends mail through `smtp.gmail.com:587` using `nodemailer.createTransport`.
- Auth: requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` environment variables (Gmail App Password, not a regular password). Missing creds return a 500 error.
- Stable behavior: recipients are deduplicated case-insensitively while preserving first-seen casing; reply-to is forwarded when provided.