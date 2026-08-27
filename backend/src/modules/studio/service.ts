import type { AppEnv } from '../../config/env.js';
import {
  AiProviderError,
  rewriteWithOpenAi,
  suggestTitlesWithOpenAi,
  type RewriteResult,
  type TitleSuggestionResult,
} from '../ai/openai-compatible.js';

export type StudioCapability = 'title_suggestions' | 'academic_rewrite';

export class StudioProviderError extends Error {
  constructor(
    readonly code: string,
    readonly capability: StudioCapability,
    readonly underlyingCause?: unknown,
  ) {
    super(code);
    this.name = 'StudioProviderError';
  }
}

export function assertStudioCapability(env: AppEnv, capability: StudioCapability): void {
  if (env.STUDIO_PROVIDER === 'disabled') {
    throw new StudioProviderError('studio_not_configured', capability);
  }
  if (env.STUDIO_PROVIDER === 'external_studio') {
    throw new StudioProviderError('studio_external_not_ready', capability);
  }
  if (!env.STUDIO_DIRECT_COMPAT_ENABLED) {
    throw new StudioProviderError('studio_direct_compatibility_disabled', capability);
  }
}

export function studioReadiness(env: AppEnv) {
  return {
    provider: env.STUDIO_PROVIDER,
    directCompatibilityEnabled: env.STUDIO_DIRECT_COMPAT_ENABLED,
    externalStudioConfigured: Boolean(env.CASIO_PLUS_ENABLED && env.CASIO_PLUS_BASE_URL),
    capabilities: {
      titleSuggestions: env.STUDIO_PROVIDER === 'direct_compat' && env.STUDIO_DIRECT_COMPAT_ENABLED,
      academicRewrite: env.STUDIO_PROVIDER === 'direct_compat' && env.STUDIO_DIRECT_COMPAT_ENABLED,
      editorialProposals: Boolean(env.CASIO_PLUS_ENABLED),
    },
  } as const;
}

export async function requestTitleSuggestions(
  env: AppEnv,
  input: { topic: string; locale: 'fa' | 'en'; count?: number },
  signal?: AbortSignal,
): Promise<TitleSuggestionResult> {
  assertStudioCapability(env, 'title_suggestions');
  try {
    return await suggestTitlesWithOpenAi(env, input, signal);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new StudioProviderError('studio_provider_request_failed', 'title_suggestions', error);
  }
}

export async function requestAcademicRewrite(
  env: AppEnv,
  input: { source: string; tone: string; targetLang: 'fa' | 'en'; length: string; customPrompt?: string },
  signal?: AbortSignal,
): Promise<RewriteResult> {
  assertStudioCapability(env, 'academic_rewrite');
  try {
    return await rewriteWithOpenAi(env, input, signal);
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new StudioProviderError('studio_provider_request_failed', 'academic_rewrite', error);
  }
}
