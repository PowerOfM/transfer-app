import { describe, expect, it } from "vitest";
import { EncryptionHelper, UInt8Encoder } from "./EncryptionHelper";

describe(EncryptionHelper.name, () => {
  it("encrypts and decrypts", async () => {
    const passkey = "secret";
    const enc = new EncryptionHelper(passkey);
    const actual = "This is a test string";
    const cipher = await enc.encrypt(actual);

    const dec = new EncryptionHelper(passkey);
    const plaintext = await dec.decrypt(cipher);

    expect(plaintext).toBe(actual);
    console.log("Result: ", actual);
  });
});

describe(UInt8Encoder.name, () => {
  it("converts", () => {
    const data = crypto.getRandomValues(new Uint8Array(16));
    const serialized = UInt8Encoder.toString(data);
    console.log("Serialized", serialized);
    const deserialized = UInt8Encoder.toArray(serialized);
    expect(deserialized).toEqual(data);
  });
});
