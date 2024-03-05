import { weakHash } from "./CryptoHelpers";

const PASSKEY_PREFIX = "Areodrop";
const IV_LEN = 12;
const SALT_LEN = 16;

export class EncryptionHelper {
  private salt?: Uint8Array;
  private key?: CryptoKey;

  constructor(private passkey: string) {}

  public async encrypt(plainText: string): Promise<string> {
    const salt = this.getSalt();
    const key = this.key || (await this.createKey(salt));
    const encoder = new TextEncoder();

    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plainText),
    );

    const encryptedArray = new Uint8Array([
      ...iv,
      ...salt,
      ...new Uint8Array(encryptedBuffer),
    ]);
    return UInt8ToBase64.toBase64(encryptedArray);
  }

  public async decrypt(encryptedText: string): Promise<string> {
    const decoder = new TextDecoder();
    const encryptedArray = UInt8ToBase64.toArray(encryptedText);

    const iv = encryptedArray.slice(0, IV_LEN);
    const salt = encryptedArray.slice(IV_LEN, SALT_LEN + IV_LEN);
    const key = this.key || (await this.createKey(salt));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedArray.slice(SALT_LEN + IV_LEN),
    );

    return decoder.decode(new Uint8Array(decryptedBuffer));
  }

  private getSalt() {
    if (this.salt) return this.salt;
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    this.salt = salt;
    return salt;
  }

  private async createKey(salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const encodedPasskey = encoder.encode(this.passkey);

    const basekey = await crypto.subtle.importKey(
      "raw",
      encodedPasskey,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      basekey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    this.key = key;
    return key;
  }

  public clearSalt() {
    this.salt = undefined;
  }

  public static async build(ip: string, emojiKey: string) {
    const hashIp = await weakHash(ip);
    const passkey = PASSKEY_PREFIX + hashIp + emojiKey;

    return new EncryptionHelper(passkey);
  }
}

class UInt8ToBase64 {
  public static toBase64(array: Uint8Array) {
    const output: string[] = [];

    for (let i = 0, length = array.length; i < length; i++) {
      output.push(String.fromCharCode(array[i]));
    }

    return btoa(output.join(""));
  }

  public static toArray(chars: string) {
    return Uint8Array.from(atob(chars), (c) => c.charCodeAt(0));
  }
}
