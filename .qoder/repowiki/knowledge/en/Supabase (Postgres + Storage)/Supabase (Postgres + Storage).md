---
kind: external_dependency
name: Supabase (Postgres + Storage)
slug: supabase
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
source_files:
    - lib/supabaseClient.js
    - app/api/notify/route.js
---

### Supabase
- Role: Backend-as-a-Service providing the shared Postgres database (`jmis_settings` table) and public storage bucket used by both this website and the admin dashboard.
- Integration points:
  - `lib/supabaseClient.js` creates a client with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for public reads (hero/gallery/facility images via `/storage/v1/object/public/setting/{file}`).
  - `app/api/notify/route.js` re-instantiates a Supabase client server-side to resolve the school's admin email from `jmis_settings.adminEmail` before sending email.
- Auth model: anon key only on the client side; server route uses the same credentials to read settings. No RLS rules are visible here — rely on the shared project's policies.
- Verify exact table/column names against the admin dashboard schema since this repo only references `jmis_settings`.