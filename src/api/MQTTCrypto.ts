import {
  aesDecrypt,
  aesEncrypt,
  makeIV,
  makeKey,
  makeSalt,
  weakHash,
} from "./CryptoHelpers";

const CRYPTO_PASSKEY_PREFIX = "Areodrop";

type MessageBody = [ArrayBuffer, Uint8Array, Uint8Array | undefined];

export class MQTTCrypto {
  private salt?: Uint8Array;
  private key?: CryptoKey;

  constructor(private passkey: string) {}

  public async encode(data: string) {
    let sendSalt = false;
    if (!this.salt) {
      this.salt = makeSalt();
      sendSalt = true;
    }
    if (!this.key) {
      this.key = await makeKey(this.passkey, this.salt);
    }

    const iv = makeIV();
    const cypher = await aesEncrypt(data, this.key, iv);
    const result = [cypher, iv];
    if (sendSalt) result.push(this.salt);

    // TODO: look into alternate serialization library
    return JSON.stringify(result);
  }

  public async decode(data: string) {
    const [cypher, iv, salt] = JSON.parse(data) as MessageBody;

    if (salt) {
      this.salt = salt;
      this.key = await makeKey(this.passkey, salt);
    }
    if (!this.key) {
      if (!this.salt) {
        throw new Error("Not salty enough");
      }
      this.key = await makeKey(this.passkey, this.salt);
    }

    // TODO: look into alternate deserialization library
    const result = await aesDecrypt(cypher, this.key, iv);
    return new TextDecoder().decode(result);
  }

  public static async build(ip: string, emojiKey: string) {
    const hashIp = await weakHash(ip);
    const passkey = CRYPTO_PASSKEY_PREFIX + hashIp + emojiKey;

    return new MQTTCrypto(passkey);
  }
}
