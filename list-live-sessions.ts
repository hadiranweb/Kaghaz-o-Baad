import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_live_sessions",
  title: "List live sessions",
  description: "List live/scheduled sessions, newest first, with schedule and status.",
  inputSchema: {
    status: z.enum(["scheduled", "live", "ended", "cancelled"]).optional().describe("Filter by session status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("live_sessions")
      .select("id, room_name, title_en, title_fa, description_en, description_fa, status, scheduled_at, started_at, ended_at, max_participants")
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
