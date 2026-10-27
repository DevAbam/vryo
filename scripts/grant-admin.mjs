// Bootstrap staff roles (run on a trusted machine with the service-role key).
// Everything else, such as verification, is done in the app's admin pages.
//
//   npm run admin:role -- <handle>                   grant admin
//   npm run admin:role -- <handle> --role moderator  grant moderator
//   npm run admin:role -- <handle> --revoke          remove admin
//
// Every change is written to audit_log.
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    role: { type: "string", default: "admin" },
    revoke: { type: "boolean", default: false },
  },
});
const handle = (positionals[0] ?? "").replace(/^@/, "").toLowerCase();
if (!/^[a-z0-9_]{3,20}$/.test(handle) || !["admin", "moderator"].includes(values.role)) {
  console.error("Usage: npm run admin:role -- <handle> [--role admin|moderator] [--revoke]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: profile, error } = await supabase
  .from("profiles")
  .select("id, display_name")
  .eq("handle", handle)
  .maybeSingle();
if (error) throw error;
if (!profile) {
  console.error(`No account with handle @${handle}.`);
  process.exit(1);
}

const change = values.revoke
  ? supabase.from("user_roles").delete().eq("user_id", profile.id).eq("role", values.role)
  : supabase
      .from("user_roles")
      .upsert({ user_id: profile.id, role: values.role }, { onConflict: "user_id,role" });
const { error: changeError } = await change;
if (changeError) throw changeError;

await supabase.from("audit_log").insert({
  actor_id: null,
  action: values.revoke ? "role.revoked" : "role.granted",
  target_type: "profile",
  target_id: profile.id,
  metadata: { role: values.role, via: "cli" },
});

console.log(
  values.revoke
    ? `Removed ${values.role} from ${profile.display_name} (@${handle}).`
    : `${profile.display_name} (@${handle}) is now ${values.role}.`,
);
