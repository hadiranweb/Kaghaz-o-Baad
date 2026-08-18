import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_PROVIDER: z.string().default('openai'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-5-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(30_000),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_IP_PER_MINUTE: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_USER_PER_MINUTE: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_AI_PER_MINUTE: z.coerce.number().int().positive().default(10),
  AI_CACHE_ENABLED: z.coerce.boolean().default(true),
  AI_TITLE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().max(604800).default(86400),
  AI_TITLE_PROMPT_VERSION: z.string().default('title-v1'),
  ZARINPAL_MERCHANT_ID: z.string().uuid().optional(),
  ZARINPAL_SANDBOX: z.coerce.boolean().default(false),
  PAYMENT_CALLBACK_BASE_URL: z.string().url().optional(),
  PAYMENT_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(30_000),
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SMSIR_API_KEY: z.string().optional(),
  SMSIR_TEMPLATE_ID: z.coerce.number().int().positive().optional(),
  SMSIR_CODE_PARAMETER: z.string().min(1).max(50).default('Code'),
  SMSIR_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(10_000),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().max(900).default(120),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().max(10).default(5),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid backend environment: ${details}`);
  }
  return parsed.data;
}
