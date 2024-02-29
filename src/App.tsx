import { useEffect, useState } from "react";
import { weakHash } from "./api/CryptoHelpers";
import { SignalingClient } from "./api/MQTTSecureClient";

export const App = () => {
  const [value, setValue] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    SignalingClient.getChannelName("127.0.0.1")
      .then(console.log)
      .catch(console.error);
  }, []);

  const handleClick = () => {
    weakHash(value)
      .then(setResult)
      .catch((err) => setResult("ERR: " + err.message));
  };

  return (
    <>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleClick}>Hash</button>
      <p>{result}</p>
    </>
  );
};
