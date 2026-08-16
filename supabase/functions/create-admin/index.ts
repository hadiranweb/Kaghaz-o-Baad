import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const TEST_USERS = [
  {
    role: "admin" as const,
    email: "hadiranweb@gmail.com",
    password: "H@drianus#Jeff2026!Baad",
    first_name: "hadrianus",
    last_name: "jeff",
    show_on_cards: true,
    show_in_community: true,
  },
  {
    role: "admin" as const,
    email: "admin@kaghazbaad.test",
    password: "TestAdmin@2026!",
    first_name: "مدیر",
    last_name: "تست (Admin)",
    show_on_cards: true,
    show_in_community: true,
  },
  {
    role: "editor" as const,
    email: "editor@kaghazbaad.test",
    password: "TestEditor@2026!",
    first_name: "ویراستار",
    last_name: "تست (Editor)",
    show_on_cards: true,
    show_in_community: true,
  },
  {
    role: "contributor" as const,
    email: "contributor@kaghazbaad.test",
    password: "TestContributor@2026!",
    first_name: "نویسنده",
    last_name: "تست (Contributor)",
    show_on_cards: true,
    show_in_community: true,
  },
  {
    role: "user" as const,
    email: "user@kaghazbaad.test",
    password: "TestUser@2026!",
    first_name: "کاربر",
    last_name: "عادی (User)",
    show_on_cards: false,
    show_in_community: false,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const results = [];

    for (const item of TEST_USERS) {
      let userId: string | null = null;
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === item.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: item.password,
          email_confirm: true,
          user_metadata: { first_name: item.first_name, last_name: item.last_name },
        });
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: item.email,
          password: item.password,
          email_confirm: true,
          user_metadata: { first_name: item.first_name, last_name: item.last_name },
        });
        if (createErr) throw createErr;
        userId = created.user!.id;
      }

      // Ensure profile
      await supabase.from("profiles").upsert(
        {
          user_id: userId,
          first_name: item.first_name,
          last_name: item.last_name,
          phone: "",
          show_on_cards: item.show_on_cards,
          show_in_community: item.show_in_community,
        },
        { onConflict: "user_id" },
      );

      // Grant role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: item.role }, { onConflict: "user_id,role" });
      if (roleErr) throw roleErr;

      results.push({
        email: item.email,
        role: item.role,
        user_id: userId,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, users: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
