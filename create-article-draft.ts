import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_article_draft",
  title: "Create article draft",
  description: "Create a new draft article authored by the signed-in user. Drafts are not publicly visible.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("URL slug, lowercase with hyphens."),
    title_fa: z.string().trim().min(1).describe("Persian title."),
    title_en: z.string().trim().min(1).describe("English title."),
    summary_fa: z.string().trim().optional().describe("Short Persian summary."),
    summary_en: z.string().trim().optional().describe("Short English summary."),
    tags: z.array(z.string().trim()).optional().describe("Tag list."),
    categories: z.array(z.string().trim()).optional().describe("Category list."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("articles")
      .insert({ ...input, status: "draft", author_id: ctx.getUserId() })
      .select("id, slug, title_fa, title_en, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { article: data },
    };
  },
});
