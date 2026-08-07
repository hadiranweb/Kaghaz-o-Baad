import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_articles",
  title: "List articles",
  description: "List articles visible to the signed-in user, newest first. Optional text search and status filter.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text search across English and Persian titles."),
    status: z.enum(["draft", "published"]).optional().describe("Filter by article status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ query, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("articles")
      .select("id, slug, title_en, title_fa, summary_en, summary_fa, status, tags, categories, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    if (query) q = q.or(`title_en.ilike.%${query}%,title_fa.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
