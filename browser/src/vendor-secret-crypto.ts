import { createDecipheriv, scryptSync } from "node:crypto";

const LEGACY_DEVELOPMENT_KEY = "keledon-vendor-secret-key-32!";
const PAIRING_PREFIX = "keledon:vendor:pairing:v2";

function encryptionSecret(): string {
  const configuredSecret = process.env.KELEDON_VENDOR_KEY?.trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("KELEDON_VENDOR_KEY must be configured in production");
  }
  return LEGACY_DEVELOPMENT_KEY;
}

function derivePairingKey(): Buffer {
  return scryptSync(encryptionSecret(), "keledon:vendor:pairing:v1", 32);
}

function decryptPairingEnvelope(value: string): string {
  const parts = value.split(":");
  if (parts.length !== 7 || parts.slice(0, 4).join(":") !== PAIRING_PREFIX) {
    throw new Error("Unsupported vendor-secret envelope");
  }
  const [, , , , ivValue, tagValue, ciphertextValue] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    derivePairingKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function decryptLegacyPairingValue(value: string): string | undefined {
  const [ivHex, ciphertext] = value.split(":");
  if (
    !/^[0-9a-f]{32}$/i.test(ivHex || "") ||
    !/^(?:[0-9a-f]{2})+$/i.test(ciphertext || "")
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
      const key = scryptSync(secret, "salt", 32);
      const decipher = createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(ivHex, "hex"),
      );
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "hex")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // Try the other historical key; CBC remains read-only compatibility.
    }
  }
  return undefined;
}

export function decryptPairedVendorSecret(value: string): string {
  if (value.startsWith(`${PAIRING_PREFIX}:`)) {
    return decryptPairingEnvelope(value);
  }
  return decryptLegacyPairingValue(value) ?? value;
}
