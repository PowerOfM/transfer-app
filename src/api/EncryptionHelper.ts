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
      encoder.encode(plainText)
    );

    const encryptedArray = new Uint8Array([
      ...iv,
      ...salt,
      ...new Uint8Array(encryptedBuffer),
    ]);
    return this.arrayBufferToBase64(encryptedArray);
  }

  public async decrypt(encryptedText: string): Promise<string> {
    const decoder = new TextDecoder();
    const encryptedArray = this.base64ToArrayBuffer(encryptedText);

    const iv = encryptedArray.slice(0, IV_LEN);
    const salt = encryptedArray.slice(IV_LEN, SALT_LEN + IV_LEN);
    const key = this.key || (await this.createKey(salt));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedArray.slice(IV_LEN)
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
      ["deriveBits", "deriveKey"]
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
      ["encrypt", "decrypt"]
    );
    this.key = key;
    return key;
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; ++i) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  public static async build(ip: string, emojiKey: string) {
    const hashIp = await weakHash(ip);
    const passkey = PASSKEY_PREFIX + hashIp + emojiKey;

    return new EncryptionHelper(passkey);
  }
}
