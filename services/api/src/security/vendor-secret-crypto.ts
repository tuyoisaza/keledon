import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const LEGACY_DEVELOPMENT_KEY = 'keledon-vendor-secret-key-32!';
const STORAGE_PREFIX = 'keledon:vendor:storage:v1';
const PAIRING_PREFIX = 'keledon:vendor:pairing:v2';
const MANAGED_INTERFACE_PREFIX = 'keledon:managed-interface:storage:v1';

function encryptionSecret(): string {
  const configuredSecret = process.env.KELEDON_VENDOR_KEY?.trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('KELEDON_VENDOR_KEY must be configured in production');
  }
  return LEGACY_DEVELOPMENT_KEY;
}

function deriveKey(purpose: 'storage' | 'pairing'): Buffer {
  return scryptSync(encryptionSecret(), `keledon:vendor:${purpose}:v1`, 32);
}

function deriveManagedInterfaceKey(): Buffer {
  const configuredSecret = process.env.KELEDON_VENDOR_KEY?.trim();
  if (!configuredSecret || configuredSecret.length < 32) {
    throw new Error(
      'KELEDON_VENDOR_KEY must contain at least 32 characters to store managed interface credentials',
    );
  }
  return scryptSync(
    configuredSecret,
    'keledon:managed-interface:storage:v1',
    32,
  );
}

export function encryptManagedInterfaceSecretAtRest(value: string): string {
  if (value === '') return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveManagedInterfaceKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [
    MANAGED_INTERFACE_PREFIX,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptManagedInterfaceSecretAtRest(value: string): string {
  if (!value.startsWith(`${MANAGED_INTERFACE_PREFIX}:`)) {
    throw new Error('Unsupported managed-interface secret envelope');
  }
  const parts = value.split(':');
  if (parts.length !== 7) {
    throw new Error('Invalid managed-interface secret envelope');
  }
  const [, , , , ivValue, tagValue, ciphertextValue] = parts;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveManagedInterfaceKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function isManagedInterfaceSecretEncrypted(
  value: string | null,
): boolean {
  return value?.startsWith(`${MANAGED_INTERFACE_PREFIX}:`) ?? false;
}

function encryptEnvelope(
  value: string,
  purpose: 'storage' | 'pairing',
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(purpose), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const prefix = purpose === 'storage' ? STORAGE_PREFIX : PAIRING_PREFIX;
  return [
    prefix,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

function decryptEnvelope(
  value: string,
  purpose: 'storage' | 'pairing',
): string {
  const prefix = purpose === 'storage' ? STORAGE_PREFIX : PAIRING_PREFIX;
  const parts = value.split(':');
  if (parts.length !== 7 || parts.slice(0, 4).join(':') !== prefix) {
    throw new Error('Unsupported vendor-secret envelope');
  }
  const [, , , , ivValue, tagValue, ciphertextValue] = parts;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(purpose),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function decryptLegacyPairingValue(value: string): string | undefined {
  const [ivHex, ciphertext] = value.split(':');
  if (
    !/^[0-9a-f]{32}$/i.test(ivHex || '') ||
    !/^(?:[0-9a-f]{2})+$/i.test(ciphertext || '')
  ) {
    return undefined;
  }
  const configuredSecret = process.env.KELEDON_VENDOR_KEY?.trim();
  const legacySecrets = [configuredSecret, LEGACY_DEVELOPMENT_KEY].filter(
    (secret, index, secrets): secret is string =>
      !!secret && secrets.indexOf(secret) === index,
  );
  for (const secret of legacySecrets) {
    try {
      const key = scryptSync(secret, 'salt', 32);
      const decipher = createDecipheriv(
        'aes-256-cbc',
        key,
        Buffer.from(ivHex, 'hex'),
      );
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Try the other historical key; CBC remains read-only compatibility.
    }
  }
  return undefined;
}

export function isVendorSecretEncryptedAtRest(value: string | null): boolean {
  return value?.startsWith(`${STORAGE_PREFIX}:`) ?? false;
}

export function decryptVendorSecretAtRest(value: string): string {
  if (value.startsWith(`${STORAGE_PREFIX}:`)) {
    return decryptEnvelope(value, 'storage');
  }
  return decryptLegacyPairingValue(value) ?? value;
}

export function encryptVendorSecretAtRest(value: string): string {
  if (value === '') return value;
  return encryptEnvelope(decryptVendorSecretAtRest(value), 'storage');
}

export function encryptVendorSecretForPairing(value: string): string {
  if (value === '') return value;
  return encryptEnvelope(decryptVendorSecretAtRest(value), 'pairing');
}
