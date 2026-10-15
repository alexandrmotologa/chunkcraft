import { describe, it, expect } from 'vitest';
import { JsonKeyPathChunker } from '../../src/core/chunkers/json-keypath.js';

describe('JsonKeyPathChunker', () => {
  const chunker = new JsonKeyPathChunker();

  const jsonSample = JSON.stringify({
    security: {
      authentication: {
        mfa: {
          enforced: true,
          methods: ['fido2', 'totp']
        },
        password: {
          minLength: 16,
          rotationDays: 90
        }
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotation: 'annual'
      }
    }
  }, null, 2);

  it('generates flattened key-path chunks preserving parent context', async () => {
    const chunks = await chunker.chunk(jsonSample, {
      chunkSize: 40,
      chunkOverlap: 10
    }, 'json-test');

    expect(chunks.length).toBeGreaterThan(0);
    const mfaChunk = chunks.find(c => c.content.includes('security.authentication.mfa'));
    expect(mfaChunk).toBeDefined();
    expect(mfaChunk?.content).toContain('fido2');
  });
});
