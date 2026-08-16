import { createHash } from 'node:crypto';
import { db } from '../../db/pool.js';
import type { TitleSuggestion } from '../ai/openai-compatible.js';

export type TitleCacheInput = {
  userId: string;
  topic: string;
  locale: 'fa' | 'en';
  count: number;
  provider: string;
  model: string;
  promptVersion: string;
};

export type CachedTitleResponse = {
  suggestions: TitleSuggestion[];
  cachedAt: string;
};

function normalizeTopic(topic: string) {
  return topic.trim().normalize('NFKC').replace(/\s+/g, ' ');
}

export function makeTitleCacheKey(input: TitleCacheInput) {
  const canonical = JSON.stringify({
    scope: 'user',
    userId: input.userId,
    featureKey: 'ai.title_suggestions',
    topic: normalizeTopic(input.topic),
    locale: input.locale,
    count: input.count,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function getCachedTitleSuggestions(input: TitleCacheInput): Promise<{ key: string; value: CachedTitleResponse } | null> {
  const key = makeTitleCacheKey(input);
  const result = await db.query<{ response: CachedTitleResponse }>(
    `SELECT response FROM ai_response_cache
     WHERE cache_key = $1 AND user_id = $2 AND feature_key = 'ai.title_suggestions'
       AND provider = $3 AND model = $4 AND prompt_version = $5 AND expires_at > now()`,
    [key, input.userId, input.provider, input.model, input.promptVersion],
  );
  const value = result.rows[0]?.response;
  return value ? { key, value } : null;
}

export async function putCachedTitleSuggestions(input: TitleCacheInput, suggestions: TitleSuggestion[], ttlSeconds: number) {
  const key = makeTitleCacheKey(input);
  const value: CachedTitleResponse = { suggestions, cachedAt: new Date().toISOString() };
  await db.query(
    `INSERT INTO ai_response_cache
       (cache_key, user_id, feature_key, provider, model, prompt_version, response, expires_at)
     VALUES ($1, $2, 'ai.title_suggestions', $3, $4, $5, $6, now() + ($7 || ' seconds')::interval)
     ON CONFLICT (cache_key) DO UPDATE SET response = EXCLUDED.response,
       expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [key, input.userId, input.provider, input.model, input.promptVersion, value, ttlSeconds],
  );
  return { key, value };
}
