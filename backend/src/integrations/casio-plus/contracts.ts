import { z } from 'zod';

export const CASIO_INTEGRATION_KEY = 'kaghazbaad' as const;
export const CASIO_EDITORIAL_FLOW_KEY = 'article_editorial_suggestion' as const;
export const CASIO_FLOW_INVOKE_CONTRACT = 'casio.flow.invoke.v1' as const;
export const CASIO_FLOW_ACCEPTED_CONTRACT = 'casio.flow.accepted.v1' as const;
export const CASIO_FLOW_CALLBACK_CONTRACT = 'casio.flow.callback.v1' as const;

const uuidSchema = z.string().uuid();
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, 'Expected a SHA-256 hex digest');
const requestIdSchema = uuidSchema;
const idempotencyKeySchema = z.string().trim().min(16).max(200);

export const casioActorSchema = z.object({
  id: uuidSchema,
  type: z.literal('human'),
  roles: z.array(z.string().trim().min(1).max(80)).min(1).max(16),
}).strict();

export const casioArticleSourceSchema = z.object({
  type: z.literal('article'),
  id: uuidSchema,
  snapshotId: uuidSchema,
  contentRevision: z.number().int().positive(),
  contentSha256: sha256Schema,
}).strict();

export const casioEditorialInputSchema = z.object({
  language: z.enum(['fa', 'en']).default('fa'),
  title: z.string().trim().min(1).max(300),
  textSnapshot: z.string().min(1).max(180 * 1024),
  requestedAction: z.literal('editorial_suggestion'),
  tone: z.enum(['academic', 'formal', 'neutral']).default('academic'),
  length: z.enum(['short', 'moderate', 'detailed']).default('moderate'),
}).strict();

export const casioFlowInvokeSchema = z.object({
  contract: z.literal(CASIO_FLOW_INVOKE_CONTRACT),
  flowKey: z.literal(CASIO_EDITORIAL_FLOW_KEY),
  flowVersion: z.literal('published'),
  sourceApp: z.literal(CASIO_INTEGRATION_KEY),
  sourceEntity: casioArticleSourceSchema,
  actor: casioActorSchema,
  input: casioEditorialInputSchema,
  requestId: requestIdSchema,
  idempotencyKey: idempotencyKeySchema,
  expiresAt: z.string().datetime(),
}).strict();

export const casioFlowAcceptedSchema = z.object({
  contract: z.literal(CASIO_FLOW_ACCEPTED_CONTRACT),
  runId: z.string().trim().min(1).max(200),
  status: z.enum(['accepted', 'running', 'completed']),
  flowKey: z.literal(CASIO_EDITORIAL_FLOW_KEY),
  requestId: requestIdSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const casioSuggestionSchema = z.object({
  type: z.enum(['rewrite', 'annotation', 'checklist']),
  anchor: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }).strict().refine((value) => value.end >= value.start, 'Anchor end must not precede start'),
  originalText: z.string().max(30_000).optional(),
  suggestedText: z.string().max(30_000).optional(),
  reason: z.string().trim().min(1).max(4_000),
  confidence: z.number().min(0).max(1).nullable().optional(),
}).strict();

export const casioFlowCallbackSchema = z.object({
  contract: z.literal(CASIO_FLOW_CALLBACK_CONTRACT),
  eventId: uuidSchema,
  runId: z.string().trim().min(1).max(200),
  status: z.enum(['completed', 'failed', 'cancelled']),
  flowKey: z.literal(CASIO_EDITORIAL_FLOW_KEY),
  sourceEntity: casioArticleSourceSchema,
  requestId: requestIdSchema,
  idempotencyKey: idempotencyKeySchema,
  result: z.object({
    suggestions: z.array(casioSuggestionSchema).max(100),
  }).strict().optional(),
  error: z.object({
    code: z.string().trim().min(1).max(120),
    retryable: z.boolean(),
  }).strict().optional(),
  artifactRefs: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  memoryRefs: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  provenance: z.object({
    flowVersion: z.string().trim().min(1).max(120),
    runtime: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(200).optional(),
    createdAt: z.string().datetime(),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.status === 'completed' && !value.result) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Completed callbacks must include a result' });
  }
  if (value.status !== 'completed' && !value.error) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Failed or cancelled callbacks must include an error' });
  }
});

export type CasioFlowInvoke = z.infer<typeof casioFlowInvokeSchema>;
export type CasioFlowAccepted = z.infer<typeof casioFlowAcceptedSchema>;
export type CasioFlowCallback = z.infer<typeof casioFlowCallbackSchema>;
export type CasioSuggestion = z.infer<typeof casioSuggestionSchema>;

export function casioInvocationIdempotencyKey(articleId: string, contentRevision: number): string {
  return `casio:article-editorial-suggestion:${articleId}:${contentRevision}:v1`;
}
