import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';

export const ARTICLE_SNAPSHOT_SCHEMA_VERSION = 'kaghazbaad.article-snapshot.v1' as const;

export type SnapshotArticle = {
  id: string;
  slug: string;
  title_fa: string;
  title_en: string;
  content_fa: string;
  content_en: string;
  content_revision: number;
  author_id: string | null;
  status: string;
};

export type ArticleContentSnapshot = {
  id: string;
  article_id: string;
  content_revision: number;
  snapshot_schema_version: string;
  canonical_payload: ArticleSnapshotPayload;
  content_sha256: string;
  byte_size: number;
  created_at: string;
};

export type ArticleSnapshotPayload = {
  schemaVersion: typeof ARTICLE_SNAPSHOT_SCHEMA_VERSION;
  article: {
    id: string;
    contentRevision: number;
    slug: string;
  };
  content: {
    titleFa: string;
    titleEn: string;
    contentFa: string;
    contentEn: string;
  };
};

function canonicalPayload(article: SnapshotArticle): ArticleSnapshotPayload {
  return {
    schemaVersion: ARTICLE_SNAPSHOT_SCHEMA_VERSION,
    article: {
      id: article.id,
      contentRevision: Number(article.content_revision),
      slug: article.slug,
    },
    content: {
      titleFa: article.title_fa,
      titleEn: article.title_en,
      contentFa: article.content_fa,
      contentEn: article.content_en,
    },
  };
}

function serializedPayload(payload: ArticleSnapshotPayload): string {
  return JSON.stringify(payload);
}

function sha256(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function toCasioEditorialText(snapshot: ArticleContentSnapshot): { title: string; textSnapshot: string; language: 'fa' | 'en' } {
  const content = snapshot.canonical_payload.content;
  const language: 'fa' | 'en' = content.contentFa.trim() || content.titleFa.trim() ? 'fa' : 'en';
  const title = language === 'fa' ? content.titleFa : content.titleEn;
  const textSnapshot = language === 'fa' ? content.contentFa : content.contentEn;
  return { title, textSnapshot, language };
}

export async function lockArticleForSnapshot(client: PoolClient, articleId: string): Promise<SnapshotArticle | null> {
  const result = await client.query<SnapshotArticle>(
    `SELECT id, slug, title_fa, title_en, content_fa, content_en, content_revision, author_id, status
       FROM articles
      WHERE id = $1
      FOR UPDATE`,
    [articleId],
  );
  return result.rows[0] ?? null;
}

export async function createOrReuseArticleSnapshot(
  client: PoolClient,
  article: SnapshotArticle,
  actorId: string | null,
): Promise<ArticleContentSnapshot> {
  const payload = canonicalPayload(article);
  const serialized = serializedPayload(payload);
  const contentSha256 = sha256(serialized);
  const byteSize = Buffer.byteLength(serialized, 'utf8');

  const inserted = await client.query<ArticleContentSnapshot>(
    `INSERT INTO article_content_snapshots
       (article_id, content_revision, snapshot_schema_version, canonical_payload, content_sha256, byte_size, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (article_id, content_revision) DO NOTHING
     RETURNING id, article_id, content_revision, snapshot_schema_version, canonical_payload,
               content_sha256, byte_size, created_at`,
    [
      article.id,
      article.content_revision,
      ARTICLE_SNAPSHOT_SCHEMA_VERSION,
      payload,
      contentSha256,
      byteSize,
      actorId,
    ],
  );

  if (inserted.rows[0]) return inserted.rows[0];

  const existing = await client.query<ArticleContentSnapshot>(
    `SELECT id, article_id, content_revision, snapshot_schema_version, canonical_payload,
            content_sha256, byte_size, created_at
       FROM article_content_snapshots
      WHERE article_id = $1 AND content_revision = $2
      FOR UPDATE`,
    [article.id, article.content_revision],
  );
  const snapshot = existing.rows[0];
  if (!snapshot) throw new Error('article_snapshot_not_found_after_conflict');
  if (snapshot.content_sha256 !== contentSha256) {
    throw new Error('article_snapshot_revision_conflict');
  }
  return snapshot;
}
