import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppEnv } from '../../config/env.js';

export type MediaCategory = 'image' | 'avatar' | 'document' | 'presentation' | 'audio' | 'video';

export const ALLOWED_MEDIA_TYPES: Record<MediaCategory, {
  mimeTypes: readonly string[];
  extensions: readonly string[];
  maxSizeBytes: number;
}> = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  },
  avatar: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  },
  document: {
    mimeTypes: ['application/pdf', 'application/epub+zip', 'text/plain', 'text/markdown'],
    extensions: ['.pdf', '.epub', '.txt', '.md'],
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
  },
  presentation: {
    mimeTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['.pdf', '.ppt', '.pptx'],
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
  },
  audio: {
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/m4a'],
    extensions: ['.mp3', '.wav', '.ogg', '.webm', '.aac', '.m4a'],
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
  },
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'],
    extensions: ['.mp4', '.webm', '.mov', '.ogv'],
    maxSizeBytes: 500 * 1024 * 1024, // 500 MB
  },
};

export function storageConfigured(env: AppEnv): env is AppEnv & {
  S3_ENDPOINT: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
} {
  return Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

function client(env: AppEnv) {
  if (!storageConfigured(env)) throw new Error('storage_not_configured');
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Strips path traversal sequences, null bytes, and non-printable characters from filenames.
 */
export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? 'unnamed';
  const clean = baseName
    .replace(/[\0\x00-\x1f\x7f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.length > 0 ? clean.slice(0, 180) : 'file';
}

export type MediaValidationResult = {
  valid: boolean;
  category: MediaCategory;
  safeName: string;
  contentType: string;
  error?: string;
};

/**
 * Validates media filename, extension, MIME type, and size constraints against allowed categories.
 */
export function validateMediaUpload(input: {
  fileName: string;
  contentType: string;
  type?: string;
  fileSize?: number;
}): MediaValidationResult {
  const { fileName, contentType, type, fileSize } = input;

  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    return { valid: false, category: 'document', safeName: 'file', contentType, error: 'invalid_filename' };
  }

  const safeName = sanitizeFileName(fileName);
  const ext = (safeName.includes('.') ? `.${safeName.split('.').pop()}` : '').toLowerCase();

  if (!ext || ext === '.') {
    return { valid: false, category: 'document', safeName, contentType, error: 'missing_file_extension' };
  }

  const requestedType = (type || 'document').toLowerCase();
  const category: MediaCategory = (requestedType in ALLOWED_MEDIA_TYPES ? requestedType : 'document') as MediaCategory;
  const categoryConfig = ALLOWED_MEDIA_TYPES[category];

  const normalizedContentType = (contentType || '').trim().toLowerCase();

  if (!categoryConfig.mimeTypes.includes(normalizedContentType)) {
    return { valid: false, category, safeName, contentType: normalizedContentType, error: 'unsupported_content_type' };
  }

  if (!categoryConfig.extensions.includes(ext)) {
    return { valid: false, category, safeName, contentType: normalizedContentType, error: 'extension_mismatch' };
  }

  if (typeof fileSize === 'number' && fileSize > 0) {
    if (fileSize > categoryConfig.maxSizeBytes) {
      return { valid: false, category, safeName, contentType: normalizedContentType, error: 'file_too_large' };
    }
  }

  return { valid: true, category, safeName, contentType: normalizedContentType };
}

export async function createUploadUrl(
  env: AppEnv,
  input: {
    userId: string;
    fileName: string;
    contentType: string;
    type?: string;
    fileSize?: number;
    expiresIn?: number;
  },
) {
  const validation = validateMediaUpload(input);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error || 'invalid_media_upload'), { statusCode: 400 });
  }

  const expiresIn = Math.min(Math.max(input.expiresIn ?? 900, 60), 3600); // 1 to 60 minutes
  const key = `${input.userId}/${validation.category}/${Date.now()}-${validation.safeName}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: validation.contentType,
    Metadata: {
      user_id: input.userId,
      category: validation.category,
      uploaded_at: new Date().toISOString(),
    },
  });

  const uploadUrl = await getSignedUrl(client(env), command, { expiresIn });
  const publicUrl = `${env.S3_ENDPOINT!.replace(/\/$/, '')}/${env.S3_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;

  return {
    uploadUrl,
    publicUrl,
    key,
    category: validation.category,
    safeName: validation.safeName,
    contentType: validation.contentType,
    expiresIn,
  };
}

export async function createDownloadUrl(
  env: AppEnv,
  input: {
    key: string;
    expiresIn?: number;
    downloadName?: string;
  },
) {
  const expiresIn = Math.min(Math.max(input.expiresIn ?? 900, 60), 3600);
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ResponseContentDisposition: input.downloadName
      ? `attachment; filename="${sanitizeFileName(input.downloadName)}"`
      : undefined,
  });

  const downloadUrl = await getSignedUrl(client(env), command, { expiresIn });
  return { downloadUrl, key: input.key, expiresIn };
}

export async function deleteObject(env: AppEnv, key: string) {
  await client(env).send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function deleteObjects(env: AppEnv, keys: string[]) {
  if (keys.length === 0) return;
  const objects = keys.map((key) => ({ Key: key }));
  await client(env).send(new DeleteObjectsCommand({ Bucket: env.S3_BUCKET, Delete: { Objects: objects } }));
}
