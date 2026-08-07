import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES = ["admin", "editor", "contributor", "user"] as const;
type Role = typeof ROLES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller has admin role
    const { data: adminCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminCheck) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;

      const ids = list.users.map((u) => u.id);
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
        admin.from("profiles").select("user_id, first_name, last_name, phone").in("user_id", ids),
      ]);

      const rolesByUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r) => {
        (rolesByUser[r.user_id] ??= []).push(r.role);
      });
      const profileByUser: Record<string, any> = {};
      (profiles ?? []).forEach((p) => (profileByUser[p.user_id] = p));

      const users = list.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        roles: rolesByUser[u.id] ?? [],
        profile: profileByUser[u.id] ?? null,
      }));
      return json({ users });
    }

    if (action === "setRole") {
      const { user_id, role, enabled } = body as { user_id: string; role: Role; enabled: boolean };
      if (!user_id || !ROLES.includes(role)) return json({ error: "Invalid input" }, 400);

      // Prevent self-demotion from admin
      if (user_id === userData.user.id && role === "admin" && !enabled) {
        return json({ error: "Cannot remove your own admin role" }, 400);
      }

      if (enabled) {
        const { error } = await admin
          .from("user_roles")
          .upsert({ user_id, role }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", role);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (action === "deleteUser") {
      const { user_id } = body as { user_id: string };
      if (!user_id) return json({ error: "Invalid input" }, 400);
      if (user_id === userData.user.id) return json({ error: "Cannot delete yourself" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "updateUser") {
      const { user_id, email, password, first_name, last_name, phone, email_confirm } = body as {
        user_id: string;
        email?: string;
        password?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        email_confirm?: boolean;
      };
      if (!user_id) return json({ error: "Invalid input" }, 400);

      // Update auth user fields
      const authAttrs: Record<string, unknown> = {};
      if (typeof email === "string" && email.trim()) authAttrs.email = email.trim();
      if (typeof password === "string" && password.length > 0) {
        if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        authAttrs.password = password;
      }
      if (typeof email_confirm === "boolean" && email_confirm) authAttrs.email_confirm = true;

      if (Object.keys(authAttrs).length > 0) {
        const { error: authErr } = await admin.auth.admin.updateUserById(user_id, authAttrs);
        if (authErr) throw authErr;
      }

      // Update profile fields
      const profileUpdate: Record<string, unknown> = {};
      if (typeof first_name === "string") profileUpdate.first_name = first_name;
      if (typeof last_name === "string") profileUpdate.last_name = last_name;
      if (typeof phone === "string") profileUpdate.phone = phone;
      // Force password change on next login when admin sets a new password
      if (typeof password === "string" && password.length > 0 && user_id !== userData.user.id) {
        profileUpdate.must_change_password = true;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profErr } = await admin
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", user_id);
        if (profErr) throw profErr;
      }

      return json({ ok: true, forcedPasswordChange: !!profileUpdate.must_change_password });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-users error", e);
    return json({ error: (e as Error).message }, 500);
  }
});