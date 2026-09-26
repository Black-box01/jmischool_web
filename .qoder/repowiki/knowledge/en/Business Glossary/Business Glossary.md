---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Portal dropdown
- Definition：A single navbar button labeled "Portal ▾" that opens a dropdown containing three entries: CBT Portal (internal link to `/cbt`), Student Portal, and Staff Portal (external links resolved from `NEXT_PUBLIC_STUDENT_PORTAL_URL` / `NEXT_PUBLIC_STAFF_PORTAL_URL`). Replaces the previous three separate portal buttons in both desktop and mobile menus.
- Aliases：portal menu、portal toggle

### CBT Portal
- Definition：The Computer-Based Test portal served by this site at the `/cbt` route, accessed internally from the Navbar's Portal dropdown.
- Aliases：cbt、computer-based test

### Student Portal
- Definition：External student-facing portal linked from the Navbar's Portal dropdown; URL is taken from the `NEXT_PUBLIC_STUDENT_PORTAL_URL` environment variable with fallback behavior.
- Aliases：student portal

### Staff Portal
- Definition：External staff-facing portal linked from the Navbar's Portal dropdown; URL is taken from the `NEXT_PUBLIC_STAFF_PORTAL_URL` environment variable with fallback behavior.
- Aliases：staff portal

### Notify API
- Definition：Server-only Next.js API route (`/api/notify`) that sends admission/contact emails via Gmail SMTP. It resolves recipients from the caller plus the school's admin email stored in Supabase's `jmis_settings` table, deduplicates them, and returns a message ID on success.
- Aliases：/api/notify、email notification endpoint
