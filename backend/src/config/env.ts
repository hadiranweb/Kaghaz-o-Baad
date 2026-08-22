import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.coerce.boolean().default(false),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET must be at least 32 characters').optional(),
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
  SMSIR_CODE_PARAMETER: z.string().min(1).max(50).default('CODE'),
  SMSIR_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(10_000),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().max(900).default(120),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().max(10).default(5),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_PUBLIC_URL: z.string().url().default('http://localhost:8080'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_REDIRECT_URI: z.string().url().optional(),
  EMAIL_PROVIDER: z.enum(['none', 'smtp', 'resend']).default('none'),
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce.number().int().positive().max(86400).default(1800),
  LIARA_MAIL_API_BASE_URL: z.string().url().default('https://mail-service.iran.liara.ir'),
  LIARA_MAIL_API_TOKEN: z.string().min(1).optional(),
  LIARA_MAIL_SERVER_ID: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  LIARA_MAIL_DOMAIN: z.string().default('kaghazobaad.ir'),
  MAILBOX_PROVISIONING_ENABLED: z.coerce.boolean().default(false),
  MAILBOX_WORKER_ENABLED: z.coerce.boolean().default(false),
  MAILBOX_WORKER_POLL_MS: z.coerce.number().int().positive().min(250).max(300_000).default(2_000),
  MAILBOX_WORKER_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(10),
  MAILBOX_WORKER_CONCURRENCY: z.coerce.number().int().positive().max(10).default(2),
  MAILBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().max(20).default(8),
  MAILBOX_BACKOFF_BASE_MS: z.coerce.number().int().positive().max(300_000).default(2_000),
  MAILBOX_BACKOFF_MAX_MS: z.coerce.number().int().positive().max(86_400_000).default(900_000),
  MAILBOX_LEASE_MS: z.coerce.number().int().positive().min(5_000).max(3_600_000).default(120_000),
  MAILBOX_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().min(1_000).max(120_000).default(15_000),
  MAILBOX_HEALTH_PORT: z.coerce.number().int().positive().max(65_535).default(8080),
  MAILBOX_RECONCILE_ENABLED: z.coerce.boolean().default(false),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env, options: { requireAuthSecret?: boolean } = {}): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid backend environment: ${details}`);
  }
  if (options.requireAuthSecret && !parsed.data.AUTH_JWT_SECRET) {
    throw new Error('Invalid backend environment: AUTH_JWT_SECRET: Required');
  }
  return parsed.data;
}
