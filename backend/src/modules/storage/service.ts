import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppEnv } from '../../config/env.js';

export function storageConfigured(env: AppEnv) {
  return Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

function client(env: AppEnv) {
  if (!storageConfigured(env)) throw new Error('storage_not_configured');
  return new S3Client({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! } });
}

export async function createUploadUrl(env: AppEnv, input: { key: string; contentType: string; expiresIn?: number }) {
  const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: input.key, ContentType: input.contentType });
  const uploadUrl = await getSignedUrl(client(env), command, { expiresIn: input.expiresIn ?? 900 });
  const publicUrl = `${env.S3_ENDPOINT!.replace(/\/$/, '')}/${env.S3_BUCKET}/${input.key.split('/').map(encodeURIComponent).join('/')}`;
  return { uploadUrl, publicUrl, key: input.key };
}

export async function deleteObject(env: AppEnv, key: string) {
  await client(env).send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
