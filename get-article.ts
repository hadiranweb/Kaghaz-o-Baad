import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_article",
  title: "Get article with slides",
  description: "Fetch one article by slug, including its ordered slides (bilingual title and body).",
  inputSchema: { slug: z.string().trim().min(1).describe("Article slug, e.g. 'my-article'.") },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: article, error } = await supabase
      .from("articles")
      .select("id, slug, title_en, title_fa, summary_en, summary_fa, status, tags, categories, cover_url, published_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!article) throw new ToolError(`No article found with slug "${slug}"`);
    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("order_num, title_en, title_fa, body_en, body_fa, media_urls")
      .eq("article_id", article.id)
      .order("order_num", { ascending: true });
    if (slidesError) return { content: [{ type: "text", text: slidesError.message }], isError: true };
    const payload = { article, slides: slides ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
