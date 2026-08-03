import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";

describe("connector credential encryption", () => {
  it("round-trips without deterministic ciphertext or plaintext leakage", () => {
    const plaintext = "secret-token-value";
    const first = encryptSecret(plaintext);
    const second = encryptSecret(plaintext);

    expect(first).not.toBe(second);
    expect(first).not.toContain(plaintext);
    expect(first).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/);
    expect(decryptSecret(first)).toBe(plaintext);
    expect(decryptSecret(second)).toBe(plaintext);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("secret-token-value");
    const segments = encrypted.split(".");
    segments[2] = `${segments[2]!.slice(0, -2)}aa`;

    expect(() => decryptSecret(segments.join("."))).toThrow(
      "Credential decryption failed",
    );
  });
});
