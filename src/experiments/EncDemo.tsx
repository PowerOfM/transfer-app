import { useMemo, useState } from "react";
import { DataEncrypter } from "../helpers/DataEncrypter";

export function EncDemo() {
  const [passkey, setPasskey] = useState("passkey");
  const [plaintext, setPlaintext] = useState("");
  const [cipher, setCipher] = useState("");

  const enc = useMemo(() => {
    return new DataEncrypter(passkey);
  }, [passkey]);

  const doEnc = () => {
    enc.encrypt(plaintext).then((value) => setCipher(value));
  };
  const doDec = () => {
    enc.decrypt(cipher).then((value) => setPlaintext(value));
  };
  const doClearSalt = () => {
    enc.clearSalt();
  };

  return (
    <div>
      <label>
        Passkey:{" "}
        <input value={passkey} onChange={(e) => setPasskey(e.target.value)} />
      </label>
      <br />
      <br />
      <label>
        Plaintext:{" "}
        <input
          value={plaintext}
          onChange={(e) => setPlaintext(e.target.value)}
        />
      </label>
      <br />
      <label>
        Ciphertext:{" "}
        <input value={cipher} onChange={(e) => setCipher(e.target.value)} />
      </label>
      <br />
      <button type="button" onClick={doEnc}>
        Encrypt
      </button>
      <button type="button" onClick={doDec}>
        Decrypt
      </button>
      <br />
      <button type="button" onClick={doClearSalt}>
        Clear Salt
      </button>
    </div>
  );
}
