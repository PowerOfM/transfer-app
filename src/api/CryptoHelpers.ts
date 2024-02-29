export const weakHash = async (
  data: string,
  alg = "SHA-1",
  outputRadix = 36
) => {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest(alg, encoded);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashB64 = hashArray
    .map((byte) => byte.toString(outputRadix).padStart(2, "0"))
    .join("");

  return hashB64;
};

export const makeSalt = () => crypto.getRandomValues(new Uint8Array(16));

export const makeIV = () => crypto.getRandomValues(new Uint8Array(12));

export const makeKey = async (passkey: string, salt: Uint8Array) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passkey),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

export const aesEncrypt = async (
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array
) => {
  const payload = new TextEncoder().encode(plaintext);
  return crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
};

export const aesDecrypt = async (
  cypher: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
) => {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cypher);
};
