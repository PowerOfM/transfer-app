import { useRef, useState } from "react";
import {
  ISignalingPeer,
  SignalingClient,
  SignalingType,
} from "./clients/SignalingClient";
import { discoverIp } from "./helpers/discoverIp";
import { generateName } from "./helpers/generateName";
import { useAsync } from "./helpers/useAsync";
import { DeviceList } from "./components/DeviceList";

const fallbackId = crypto.randomUUID();
const initialName = generateName();

interface IProps {
  ip: string;
}

const AppInner = ({ ip }: IProps) => {
  const [emoji] = useState<string>("🫠");
  const [peers, setPeers] = useState<ISignalingPeer[]>([]);
  const refPeer = useRef<string | null>(null);

  const [signalingClient, loading, error] = useAsync(
    async () => {
      if (!ip) return null;
      setPeers([]);

      const client = await SignalingClient.build(ip, initialName, emoji);
      client.onRequest((peerId) => {
        if (refPeer.current) {
          console.error(
            "Already trying to establish peering. Rejected:",
            peerId
          );
          return;
        }

        refPeer.current = peerId;

        // TODO: start connection
        client.sendData(peerId, SignalingType.Response, client.id);
      });
      client.onResponse((peerId) => {
        if (peerId !== refPeer.current) {
          console.error("Got response from someone else:", peerId);
          return;
        }
        // TODO: start connection
      });
      client.onPeers(setPeers);
      return client;
    },
    [ip, emoji],
    (client) => client && client.destroy()
  );

  if (loading) return "Loading...";
  if (error || !signalingClient) return <div>Error! {error?.message}</div>;

  const autoDiscoveryEnabled = ip !== fallbackId;
  const handlePeerClick = (peer: ISignalingPeer) => {
    if (refPeer.current) {
      console.error("Already trying to establish peering. Can't peer to", peer);
      return;
    }

    refPeer.current = peer.id;
    signalingClient.sendData(
      peer.id,
      SignalingType.Request,
      signalingClient.id
    );
  };

  return (
    <div className="p-4">
      <p>
        <b>Proto:</b> <span className="text-secondary">MQTT</span>{" "}
        <div className="kbd">{emoji}</div>
      </p>
      {autoDiscoveryEnabled && <p>Auto-discovery not available</p>}

      <DeviceList
        peers={peers}
        ownId={signalingClient.id}
        onClick={handlePeerClick}
      />
    </div>
  );
};

const LoadIp = () => {
  const [ip, loading, error] = useAsync(() => discoverIp());

  if (loading) return "Loading...";
  if (error) return <div>Error! {error.message}</div>;

  return <AppInner ip={ip ?? fallbackId} />;
};

export const App = LoadIp;
