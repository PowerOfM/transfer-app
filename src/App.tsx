import { useEffect, useRef } from "react";
import { SignalingClient } from "./api/SignalingClient";
import { getMyIP } from "./api/Networking";
import { generateName } from "./api/NameHelper";

const initialName = generateName();
const initialEmojiKey = "🫠";

export const App = () => {
  const refIP = useRef<string | null>(null);
  const refMQTT = useRef<SignalingClient | null>(null);

  useEffect(() => {
    async function run() {
      const ip = await getMyIP();
      console.log("Found IP:", ip);
      const mqtt = await SignalingClient.build(
        ip,
        initialName,
        initialEmojiKey
      );
      console.log("Created signaling client");
      refIP.current = ip;
      refMQTT.current = mqtt;
    }

    run().catch(console.error);
  }, []);

  return (
    <>
      <p>{initialName}</p>
      <p>{initialEmojiKey}</p>
    </>
  );
};
