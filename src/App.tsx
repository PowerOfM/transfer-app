import { useEffect, useRef, useState } from "react";
import {
  ISignalingPeer,
  SignalingClient,
  SignalingType,
} from "./clients/SignalingClient";
import { discoverIp } from "./helpers/discoverIp";
import { useAsync } from "./helpers/useAsync";
import { DeviceList } from "./components/DeviceList";
import { signalingClient } from "./AppContext";
import { Listener } from "typed-event-emitter";

const fallbackId = crypto.randomUUID();

interface IProps {
  ip: string;
}

const AppInner = ({ ip }: IProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [emoji] = useState<string>("🫠");
  const [peers, setPeers] = useState<ISignalingPeer[]>([]);
  const refPeer = useRef<string | null>(null);
  const refSignalingClient = useRef<SignalingClient | null>(null);

  useEffect(() => {
    setPeers([]);
    const listeners: Listener[] = [];

    async function run() {
      await signalingClient.setRoom(ip, emoji);

      const existingPeers = signalingClient.getPeers();
      if (existingPeers.length) setPeers(existingPeers);

      listeners.push(
        signalingClient.onRequest((peerId) => {
          if (refPeer.current) {
            console.error(
              "Already trying to establish peering. Rejected:",
              peerId
            );
            return;
          }

          refPeer.current = peerId;

          // TODO: start connection
          signalingClient.sendData(
            peerId,
            SignalingType.Response,
            signalingClient.id
          );
        })
      );

      listeners.push(
        signalingClient.onResponse((peerId) => {
          if (peerId !== refPeer.current) {
            console.error("Got response from someone else:", peerId);
            return;
          }
          // TODO: start connection
        })
      );

      listeners.push(signalingClient.onPeers((value) => setPeers([...value])));
    }

    console.log("Start!");
    setLoading(true);
    run()
      .then(() => setLoading(false))
      .catch((error: Error) => {
        setError(error);
        console.error("At AppInner run", error);
      });

    return () => {
      listeners.forEach((l) => l.unbind());
    };
  }, [ip, emoji]);

  if (loading) return "Loading...";
  if (error) return <div>Error! {error?.message}</div>;

  const autoDiscoveryEnabled = ip !== fallbackId;
  const handlePeerClick = (peer: ISignalingPeer) => {
    const signalingClient = refSignalingClient.current;
    if (!signalingClient) {
      console.error("Signaling client is null!");
      return;
    }
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
        <span className="kbd">{emoji}</span>
      </p>

      <DeviceList
        peers={peers}
        ownId={signalingClient.id}
        onClick={handlePeerClick}
      />

      {!autoDiscoveryEnabled && (
        <div role="alert" className="mt-3 alert alert-warning">
          <span>Auto-discovery not available</span>
        </div>
      )}
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
