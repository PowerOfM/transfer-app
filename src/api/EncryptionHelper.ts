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

    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const cipherText = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plainText),
    );

    const result = new Uint8Array([
      ...iv,
      ...salt,
      ...new Uint8Array(cipherText),
    ]);
    return UInt8Encoder.toString(result);
  }

  public async decrypt(input: string): Promise<string> {
    const inputArray = UInt8Encoder.toArray(input);

    const iv = inputArray.slice(0, IV_LEN);
    const salt = inputArray.slice(IV_LEN, SALT_LEN + IV_LEN);

    const key =
      this.key && this.checkSalt(salt) ? this.key : await this.createKey(salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      inputArray.slice(SALT_LEN + IV_LEN),
    );

    return new TextDecoder().decode(new Uint8Array(decryptedBuffer));
  }

  private getSalt() {
    if (this.salt) return this.salt;
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    this.salt = salt;
    return salt;
  }

  private checkSalt(target: Uint8Array) {
    const src = this.salt;
    if (!src || target.length !== src.length) return false;
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== target[i]) return false;
    }
    return true;
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
    this.salt = salt;
    return key;
  }

  public static async build(ip: string, emojiKey: string) {
    const hashIp = await weakHash(ip);
    const passkey = PASSKEY_PREFIX + hashIp + emojiKey;

    return new EncryptionHelper(passkey);
  }
}

export class UInt8Encoder {
  public static toString(array: Uint8Array) {
    const output: string[] = [];
    const len = array.length;
    for (let i = 0; i < len; i++) {
      // output.push(array[i].toString(36).padStart(2, "0"));
      output.push(String.fromCharCode(array[i]));
    }

    return btoa(output.join(""));
  }

  public static toArray(chars: string) {
    return Uint8Array.from(atob(chars), (c) => c.charCodeAt(0));
  }
}
