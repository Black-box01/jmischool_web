// Same Supabase project as the admin dashboard — anon key only (public site).
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public storage folder holding hero/gallery/facility images (same bucket the
// admin Settings page uploads to).
export const settingFileUrl = (file) =>
  `${supabaseUrl}/storage/v1/object/public/setting/${file}`;
