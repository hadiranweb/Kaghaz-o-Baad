import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_MEDIA_TYPES,
  sanitizeFileName,
  validateMediaUpload,
} from '../../backend/dist/modules/storage/service.js';

describe('Media & Storage Validation', () => {
  describe('Allowed Media Categories', () => {
    it('defines all 6 media categories with size limits', () => {
      const categories = Object.keys(ALLOWED_MEDIA_TYPES);
      assert.deepEqual(categories.sort(), ['audio', 'avatar', 'document', 'image', 'presentation', 'video'].sort());

      assert.equal(ALLOWED_MEDIA_TYPES.image.maxSizeBytes, 10 * 1024 * 1024);
      assert.equal(ALLOWED_MEDIA_TYPES.avatar.maxSizeBytes, 5 * 1024 * 1024);
      assert.equal(ALLOWED_MEDIA_TYPES.document.maxSizeBytes, 50 * 1024 * 1024);
      assert.equal(ALLOWED_MEDIA_TYPES.presentation.maxSizeBytes, 100 * 1024 * 1024);
      assert.equal(ALLOWED_MEDIA_TYPES.audio.maxSizeBytes, 100 * 1024 * 1024);
      assert.equal(ALLOWED_MEDIA_TYPES.video.maxSizeBytes, 500 * 1024 * 1024);
    });
  });

  describe('Filename Sanitization', () => {
    it('sanitizes unsafe characters, path traversal, and null bytes', () => {
      assert.equal(sanitizeFileName('../../../etc/passwd.pdf'), 'passwd.pdf');
      assert.equal(sanitizeFileName('C:\\Users\\Admin\\secret.docx'), 'secret.docx');
      assert.equal(sanitizeFileName('file name with spaces & symbols @#$.png'), 'file_name_with_spaces_symbols_.png');
      assert.equal(sanitizeFileName('null\x00byte\x1fattack.jpg'), 'nullbyteattack.jpg');
      assert.equal(sanitizeFileName('___leading_and_trailing___'), 'leading_and_trailing');
      assert.equal(sanitizeFileName(''), 'file');
    });
  });

  describe('validateMediaUpload validation logic', () => {
    it('accepts valid JPEG and PNG images', () => {
      const jpg = validateMediaUpload({
        fileName: 'cover-photo.jpg',
        contentType: 'image/jpeg',
        type: 'image',
        fileSize: 2 * 1024 * 1024,
      });
      assert.equal(jpg.valid, true);
      assert.equal(jpg.category, 'image');
      assert.equal(jpg.safeName, 'cover-photo.jpg');

      const png = validateMediaUpload({
        fileName: 'diagram.png',
        contentType: 'image/png',
        type: 'image',
      });
      assert.equal(png.valid, true);
      assert.equal(png.category, 'image');
    });

    it('accepts valid PDF documents and presentations', () => {
      const pdf = validateMediaUpload({
        fileName: 'research-paper.pdf',
        contentType: 'application/pdf',
        type: 'document',
        fileSize: 15 * 1024 * 1024,
      });
      assert.equal(pdf.valid, true);
      assert.equal(pdf.category, 'document');

      const pptx = validateMediaUpload({
        fileName: 'conference-slides.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        type: 'presentation',
      });
      assert.equal(pptx.valid, true);
      assert.equal(pptx.category, 'presentation');
    });

    it('accepts valid Audio and Video media', () => {
      const audio = validateMediaUpload({
        fileName: 'podcast-episode-01.mp3',
        contentType: 'audio/mpeg',
        type: 'audio',
        fileSize: 30 * 1024 * 1024,
      });
      assert.equal(audio.valid, true);
      assert.equal(audio.category, 'audio');

      const video = validateMediaUpload({
        fileName: 'session-recording.mp4',
        contentType: 'video/mp4',
        type: 'video',
        fileSize: 200 * 1024 * 1024,
      });
      assert.equal(video.valid, true);
      assert.equal(video.category, 'video');
    });

    it('rejects invalid or empty filenames', () => {
      const empty = validateMediaUpload({
        fileName: '',
        contentType: 'image/jpeg',
        type: 'image',
      });
      assert.equal(empty.valid, false);
      assert.equal(empty.error, 'invalid_filename');
    });

    it('rejects missing file extensions', () => {
      const noExt = validateMediaUpload({
        fileName: 'no-extension-file',
        contentType: 'image/jpeg',
        type: 'image',
      });
      assert.equal(noExt.valid, false);
      assert.equal(noExt.error, 'missing_file_extension');
    });

    it('rejects unsupported MIME types', () => {
      const exe = validateMediaUpload({
        fileName: 'program.exe',
        contentType: 'application/x-msdownload',
        type: 'document',
      });
      assert.equal(exe.valid, false);
      assert.equal(exe.error, 'unsupported_content_type');
    });

    it('rejects extension and content-type mismatches', () => {
      const mismatch = validateMediaUpload({
        fileName: 'malicious.exe',
        contentType: 'image/jpeg',
        type: 'image',
      });
      assert.equal(mismatch.valid, false);
      assert.equal(mismatch.error, 'extension_mismatch');
    });

    it('rejects files exceeding category size limits', () => {
      const tooBig = validateMediaUpload({
        fileName: 'giant-avatar.jpg',
        contentType: 'image/jpeg',
        type: 'avatar',
        fileSize: 10 * 1024 * 1024, // Avatar limit is 5MB
      });
      assert.equal(tooBig.valid, false);
      assert.equal(tooBig.error, 'file_too_large');
    });
  });
});
