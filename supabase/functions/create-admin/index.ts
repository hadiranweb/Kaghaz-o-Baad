import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = "hadiranweb@gmail.com";
    const password = "H@drianus#Jeff2026!Baad";
    const first_name = "hadrianus";
    const last_name = "jeff";

    // Try to find existing user
    let userId: string | null = null;
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      });
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Ensure profile
    await supabase.from("profiles").upsert(
      { user_id: userId, first_name, last_name, phone: "" },
      { onConflict: "user_id" },
    );

    // Grant admin role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});