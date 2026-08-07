import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listArticles from "./tools/list-articles";
import getArticle from "./tools/get-article";
import createArticleDraft from "./tools/create-article-draft";
import listLiveSessions from "./tools/list-live-sessions";
import whoami from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kaghaz-o-baad",
  title: "Kaghaz-o-Baad",
  version: "0.1.0",
  instructions:
    "Tools for Kaghaz-o-Baad, a bilingual (English/Persian) articles and live-sessions platform. Use `list_articles` and `get_article` to read article content and slides, `create_article_draft` to draft a new article as the signed-in user, `list_live_sessions` for upcoming or ongoing sessions, and `whoami` for the current user's profile and roles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listArticles, getArticle, createArticleDraft, listLiveSessions, whoami],
});
