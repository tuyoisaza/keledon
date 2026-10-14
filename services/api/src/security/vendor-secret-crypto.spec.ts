import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import {
  decryptVendorSecretAtRest,
  encryptVendorSecretAtRest,
  encryptVendorSecretForPairing,
  isVendorSecretEncryptedAtRest,
} from './vendor-secret-crypto';

describe('vendor secret encryption', () => {
  const priorKey = process.env.KELEDON_VENDOR_KEY;
  const priorEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.KELEDON_VENDOR_KEY = 'test-vendor-key-with-adequate-entropy';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (priorKey === undefined) delete process.env.KELEDON_VENDOR_KEY;
    else process.env.KELEDON_VENDOR_KEY = priorKey;
    if (priorEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorEnvironment;
  });

  it('encrypts secrets at rest with randomized authenticated envelopes', () => {
    const first = encryptVendorSecretAtRest('private-crm-token');
    const second = encryptVendorSecretAtRest('private-crm-token');

    expect(first).not.toBe('private-crm-token');
    expect(first).not.toBe(second);
    expect(isVendorSecretEncryptedAtRest(first)).toBe(true);
    expect(decryptVendorSecretAtRest(first)).toBe('private-crm-token');
    const parts = first.split(':');
    parts[5] = `${parts[5][0] === 'A' ? 'B' : 'A'}${parts[5].slice(1)}`;
    expect(() => decryptVendorSecretAtRest(parts.join(':'))).toThrow();
  });

  it('uses a separate pairing envelope and accepts legacy CBC pairing values', () => {
    const storageValue = encryptVendorSecretAtRest('crm-password');
    const pairedValue = encryptVendorSecretForPairing(storageValue);
    const iv = randomBytes(16);
    const configuredKey = process.env.KELEDON_VENDOR_KEY;
    if (!configuredKey) throw new Error('Test key was not configured');
    const legacyCipher = createCipheriv(
      'aes-256-cbc',
      scryptSync(configuredKey, 'salt', 32),
      iv,
    );
    const legacyValue = `${iv.toString('hex')}:${Buffer.concat([
      legacyCipher.update('legacy-password', 'utf8'),
      legacyCipher.final(),
    ]).toString('hex')}`;
    const fallbackCipher = createCipheriv(
      'aes-256-cbc',
      scryptSync('keledon-vendor-secret-key-32!', 'salt', 32),
      iv,
    );
    const fallbackLegacyValue = `${iv.toString('hex')}:${Buffer.concat([
      fallbackCipher.update('fallback-password', 'utf8'),
      fallbackCipher.final(),
    ]).toString('hex')}`;

    expect(pairedValue).toMatch(/^keledon:vendor:pairing:v2:/);
    expect(pairedValue).not.toBe(storageValue);
    expect(encryptVendorSecretAtRest(legacyValue)).not.toBe(legacyValue);
    expect(decryptVendorSecretAtRest(legacyValue)).toBe('legacy-password');
    expect(decryptVendorSecretAtRest(fallbackLegacyValue)).toBe(
      'fallback-password',
    );
  });

  it('fails closed in production when the encryption key is missing', () => {
    delete process.env.KELEDON_VENDOR_KEY;
    process.env.NODE_ENV = 'production';

    expect(() => encryptVendorSecretAtRest('secret')).toThrow(
      'KELEDON_VENDOR_KEY must be configured in production',
    );
  });
});
