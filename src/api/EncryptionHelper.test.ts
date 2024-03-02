import { describe, expect, it } from "vitest";
import { EncryptionHelper } from "./EncryptionHelper";

describe(EncryptionHelper.name, () => {
  it("encrypts and decrypts", async () => {
    const enc = new EncryptionHelper("secret");
    const actual = "This is a test string";
    const cipher = await enc.encrypt(actual);
    const plaintext = await enc.decrypt(cipher);
    expect(plaintext).toBe(actual);
  });
});
