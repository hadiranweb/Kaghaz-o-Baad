import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrackSource } from '@livekit/protocol';
import {
  parseLiveSessionRole,
  buildLiveKitTokenGrants,
  isSessionManager,
  livekitConfigured,
} from '../../backend/dist/modules/live/routes.js';

describe('LiveKit Streaming & WebRTC Token Infrastructure', () => {
  describe('Role Parsing', () => {
    it('always resolves host when isHost is true', () => {
      assert.equal(parseLiveSessionRole(true, 'viewer'), 'host');
      assert.equal(parseLiveSessionRole(true, 'speaker'), 'host');
      assert.equal(parseLiveSessionRole(true, null), 'host');
    });

    it('resolves speaker when not host but assigned speaker', () => {
      assert.equal(parseLiveSessionRole(false, 'speaker'), 'speaker');
    });

    it('defaults to viewer for unassigned or viewer roles', () => {
      assert.equal(parseLiveSessionRole(false, 'viewer'), 'viewer');
      assert.equal(parseLiveSessionRole(false, null), 'viewer');
      assert.equal(parseLiveSessionRole(false, undefined), 'viewer');
    });
  });

  describe('Token Grant Generation', () => {
    it('creates full publishing and room admin grants for host', () => {
      const grants = buildLiveKitTokenGrants('host', 'room-test-1');
      assert.equal(grants.room, 'room-test-1');
      assert.equal(grants.roomJoin, true);
      assert.equal(grants.canPublish, true);
      assert.equal(grants.canSubscribe, true);
      assert.equal(grants.canPublishData, true);
      assert.equal(grants.roomAdmin, true);
      assert.deepEqual(grants.canPublishSources, [
        TrackSource.CAMERA,
        TrackSource.MICROPHONE,
        TrackSource.SCREEN_SHARE,
      ]);
    });

    it('creates publishing grants without room admin for speaker', () => {
      const grants = buildLiveKitTokenGrants('speaker', 'room-test-2');
      assert.equal(grants.room, 'room-test-2');
      assert.equal(grants.canPublish, true);
      assert.equal(grants.roomAdmin, false);
      assert.equal(grants.canPublishSources.length, 3);
    });

    it('creates subscribe-only grants with no publishing sources for viewer', () => {
      const grants = buildLiveKitTokenGrants('viewer', 'room-test-3');
      assert.equal(grants.room, 'room-test-3');
      assert.equal(grants.canPublish, false);
      assert.equal(grants.roomAdmin, false);
      assert.deepEqual(grants.canPublishSources, []);
      assert.equal(grants.canSubscribe, true);
      assert.equal(grants.canPublishData, true);
    });
  });

  describe('Session Manager Authorization', () => {
    const session = {
      id: 'session-123',
      host_id: 'host-user-uuid',
      title: 'Academic Live Room',
      room_name: 'academic-room',
      status: 'live',
      metadata: {},
    };

    it('recognizes host user as session manager', () => {
      assert.equal(isSessionManager({ id: 'host-user-uuid', roles: ['author'] }, session), true);
    });

    it('recognizes platform managers (admin, senior_manager, editor) as session manager', () => {
      assert.equal(isSessionManager({ id: 'admin-user-uuid', roles: ['admin'] }, session), true);
      assert.equal(isSessionManager({ id: 'sm-user-uuid', roles: ['senior_manager'] }, session), true);
      assert.equal(isSessionManager({ id: 'editor-user-uuid', roles: ['editor'] }, session), true);
    });

    it('denies non-host regular participants from session management', () => {
      assert.equal(isSessionManager({ id: 'regular-user-1', roles: ['author'] }, session), false);
      assert.equal(isSessionManager({ id: 'regular-user-2', roles: [] }, session), false);
    });
  });

  describe('LiveKit Configuration Verification', () => {
    it('returns false when credentials are incomplete', () => {
      assert.equal(livekitConfigured({ LIVEKIT_URL: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '' }), false);
      assert.equal(livekitConfigured({ LIVEKIT_URL: 'wss://live.example.com', LIVEKIT_API_KEY: 'key', LIVEKIT_API_SECRET: '' }), false);
    });

    it('returns true when all 3 credentials are present', () => {
      assert.equal(livekitConfigured({
        LIVEKIT_URL: 'wss://live.kaghazobaad.ir',
        LIVEKIT_API_KEY: 'livekit-api-key',
        LIVEKIT_API_SECRET: 'livekit-api-secret-12345',
      }), true);
    });
  });
});
