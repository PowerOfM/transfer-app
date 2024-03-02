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
