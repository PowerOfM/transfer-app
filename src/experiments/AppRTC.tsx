import { useRef, useState } from "react";
import { DeviceList } from "../components/DeviceList";
import { discoverIp } from "../helpers/discoverIp";
import { generateName } from "../helpers/RandomGenerator";
import { useAsync } from "../helpers/useAsync";
import { ISignalingPeer, SignalingClient } from "../signaling/SignalingClient";

interface IProps {
  ip: string;
}

const now = Date.now();
const fallbackId = crypto.randomUUID();
const initialName = generateName();

export const AppWithIP = ({ ip }: IProps) => {
  const refSignalingClient = useRef<SignalingClient | null>(null);
  const [emoji] = useState<string>("🫠");
  const [peers, setPeers] = useState<ISignalingPeer[]>([
    { id: fallbackId, name: initialName, ts: now },
  ]);

  // useEffect(() => {
  //   async function run() {
  //     const signalingClient = await SignalingClient.build(
  //       ip,
  //       initialName,
  //       emoji
  //     );
  //     refSignalingClient.current = signalingClient;
  //     signalingClient.onUsers(setPeers);
  //   }

  //   run().catch(console.error);
  //   return () => {
  //     refSignalingClient.current?.destroy();
  //   };
  // }, [ip, emoji]);

  const handleClick = (peer) => {};

  return (
    <div className="p-4">
      <p>
        <b>Proto:</b> <span className="text-secondary">MQTT</span>{" "}
        <span className="kbd">{emoji}</span>
      </p>
      {ip === fallbackId && <p>Auto-discovery not available</p>}

      <DeviceList
        peers={peers}
        localPeerId={fallbackId}
        onClick={handleClick}
      />
    </div>
  );
};

export const App = () => {
  const [ip, loading, error] = useAsync(() => discoverIp());

  if (loading) return "Loading...";
  if (error) return <div>Error! {error.message}</div>;

  return <AppWithIP ip={ip ?? fallbackId} />;
};
