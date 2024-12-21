import { FormEvent, useEffect, useRef, useState } from "react";
import { discoverIp } from "../helpers/discoverIp";
import { generateName } from "../helpers/RandomGenerator";
import { EncryptedMQTTClient } from "../signaling/EncryptedMQTTClient";

const initialName = generateName();
const initialEmojiKey = "🫠";

export const MqqtDemo = () => {
  const refIP = useRef<string | null>(null);
  const refMQTT = useRef<EncryptedMQTTClient | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    async function run() {
      const ip = await discoverIp();
      console.log("Found IP:", ip);
      const mqtt = await EncryptedMQTTClient.build(ip, initialEmojiKey);
      mqtt.onBroadcast((msg) => setMessages((prev) => [...prev, msg]));
      mqtt.onError((err) => {
        console.error("MQTT ", err);
        setMessages((prev) => [...prev, "ERR: " + err.message]);
      });
      mqtt.onDecryptError((err) => {
        console.error("MQTT ENC ", err);
        setMessages((prev) => [...prev, "ERR ENC: " + err.message]);
      });
      mqtt.onDisconnect(() =>
        setMessages((prev) => [...prev, "< DISCONNECTED >"])
      );
      console.log("Created mqrr client");
      refIP.current = ip;
      refMQTT.current = mqtt;
    }

    run().catch(console.error);
    return () => {
      refMQTT.current?.destroy();
    };
  }, []);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!value) return;
    refMQTT.current?.send(value);
    setValue("");
  };

  return (
    <>
      <p>{initialEmojiKey}</p>
      <ul>
        {messages.map((data, key) => (
          <li key={key}>{data}</li>
        ))}
      </ul>

      <form onSubmit={handleSend}>
        <label>
          Message:{" "}
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button type="submit">Send</button>
      </form>
    </>
  );
};
