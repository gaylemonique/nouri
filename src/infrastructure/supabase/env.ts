import { z } from "zod";

// Only public values belong here: they are compiled into the app bundle.
// The service-role key must never appear in this project.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("sb_publishable_", "use the publishable key, not a secret key"),
});

// Next.js only inlines NEXT_PUBLIC_ variables that are read by their full
// name, so each one is listed explicitly instead of passing process.env.
const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Missing or invalid Supabase env vars (see .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
