import type { AppEnv } from '../../config/env.js';
import type { UsageMetrics } from '../usage/types.js';

export type TitleSuggestion = {
  title: string;
  rationale?: string;
  keywords?: string[];
};

export type TitleSuggestionResult = {
  suggestions: TitleSuggestion[];
  metrics: UsageMetrics;
  provider: string;
  model: string;
};

type ChatCompletionResponse = {
  error?: { message?: string; type?: string };
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
};

export class AiProviderError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export async function suggestTitlesWithOpenAi(
  env: AppEnv,
  input: { topic: string; locale: 'fa' | 'en'; count?: number },
  signal?: AbortSignal,
): Promise<TitleSuggestionResult> {
  if (!env.AI_API_KEY) throw new AiProviderError('ai_provider_not_configured');
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const language = input.locale === 'fa' ? 'Persian' : 'English';
  const prompt = [
    `Generate ${count} distinct academic article title suggestions in ${language}.`,
    'Return only valid JSON with this exact shape: {"suggestions":[{"title":"...","rationale":"...","keywords":["..."]}]}',
    'Do not invent research findings. Prefer precise, searchable, academically appropriate titles.',
    `Topic: ${input.topic.trim()}`,
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${env.AI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an academic title editor. Follow the requested JSON schema exactly.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new AiProviderError(`ai_provider_http_${response.status}`, detail);
    }
    const payload = await response.json() as ChatCompletionResponse;
    if (payload.error) throw new AiProviderError('ai_provider_payload_error', payload.error.message ?? 'provider_payload_error');
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new AiProviderError('ai_provider_empty_response');
    const parsed = JSON.parse(content) as { suggestions?: unknown };
    if (!Array.isArray(parsed.suggestions)) throw new AiProviderError('ai_provider_invalid_schema');
    const suggestions = parsed.suggestions
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        title: typeof item.title === 'string' ? item.title.trim() : '',
        rationale: typeof item.rationale === 'string' ? item.rationale.trim() : undefined,
        keywords: Array.isArray(item.keywords) ? item.keywords.filter((word): word is string => typeof word === 'string').slice(0, 12) : undefined,
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, count);
    if (suggestions.length === 0) throw new AiProviderError('ai_provider_no_suggestions');

    return {
      suggestions,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      metrics: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
        cachedTokens: payload.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new AiProviderError('ai_provider_timeout');
    if (error instanceof SyntaxError) throw new AiProviderError('ai_provider_invalid_json');
    throw new AiProviderError('ai_provider_request_failed');
  } finally {
    clearTimeout(timeout);
  }
}

export type RewriteResult = {
  content: string;
  metrics: UsageMetrics;
  provider: string;
  model: string;
};

export async function rewriteWithOpenAi(
  env: AppEnv,
  input: { source: string; tone: string; targetLang: 'fa' | 'en'; length: string; customPrompt?: string },
  signal?: AbortSignal,
): Promise<RewriteResult> {
  if (!env.AI_API_KEY) throw new AiProviderError('ai_provider_not_configured');
  const language = input.targetLang === 'fa' ? 'Persian' : 'English';
  const prompt = [
    `Rewrite the following academic text in ${language}.`,
    `Tone: ${input.tone}. Length: ${input.length}.`,
    input.customPrompt?.trim() ? `Additional instruction: ${input.customPrompt.trim()}` : '',
    'Preserve factual claims, do not invent citations or findings, and return only the rewritten text.',
    `Source:\n${input.source.trim()}`,
  ].filter(Boolean).join('\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${env.AI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'You are a careful academic editor. Never add unsupported facts.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new AiProviderError(`ai_provider_http_${response.status}`, (await response.text()).slice(0, 500));
    const payload = await response.json() as ChatCompletionResponse;
    if (payload.error) throw new AiProviderError('ai_provider_payload_error', payload.error.message ?? 'provider_payload_error');
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AiProviderError('ai_provider_empty_response');
    return {
      content,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      metrics: { inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0, cachedTokens: payload.usage?.prompt_tokens_details?.cached_tokens ?? 0 },
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new AiProviderError('ai_provider_timeout');
    throw new AiProviderError('ai_provider_request_failed');
  } finally {
    clearTimeout(timeout);
  }
}
