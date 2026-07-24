import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey() {
  const encoded = process.env.CREDENTIAL_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }

  return key;
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string) {
  try {
    const [version, ivEncoded, ciphertextEncoded, tagEncoded, extra] =
      payload.split(".");
    if (
      version !== VERSION ||
      !ivEncoded ||
      !ciphertextEncoded ||
      !tagEncoded ||
      extra
    ) {
      throw new Error("Invalid encrypted credential format");
    }

    const iv = Buffer.from(ivEncoded, "base64");
    const ciphertext = Buffer.from(ciphertextEncoded, "base64");
    const tag = Buffer.from(tagEncoded, "base64");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new Error("Invalid encrypted credential payload");
    }

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Credential decryption failed");
  }
}
