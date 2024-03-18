import { useEffect, useRef, useState } from "react";
import { ISignalingPeer, SignalingType } from "../clients/SignalingClient";
import { DeviceList } from "../components/DeviceList";
import { Listener } from "typed-event-emitter";
import { orchestrator } from "../AppOrchestrator";
import { WebRTCClient } from "../clients/WebRTCClient";

const orch = orchestrator;

interface IProps {
  ip: string;
  autoDiscoveryEnabled: boolean;
  onReady(): void;
}

export const SignalingPage = ({
  ip,
  autoDiscoveryEnabled,
  onReady,
}: IProps) => {
  const [emoji] = useState<string>("🫠");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [peers, setPeers] = useState<ISignalingPeer[]>([]);
  const refPeerId = useRef<string | null>(null);
  const refWRTCClient = useRef<WebRTCClient | null>(null);

  useEffect(() => {
    const listeners: Listener[] = [];

    async function run() {
      await orch.signalingClient.setRoom(ip, emoji);

      const existingPeers = orch.signalingClient.getPeers();
      if (existingPeers.length) setPeers(existingPeers);

      listeners.push(
        orch.signalingClient.onRequest((peerId) => {
          if (peerId !== orch.peerId) {
            console.error(
              "Already trying to establish peering. Rejected:",
              peerId,
            );
            return;
          }

          orch.signalingClient.sendData(
            peerId,
            SignalingType.Response,
            orch.signalingClient.id,
          );

          refPeerId.current = peerId;
          const wrtcClient = new WebRTCClient(peerId, orch.signalingClient);
          wrtcClient.onConnected(() => onReady());
          refWRTCClient.current = wrtcClient;
        }),
      );

      listeners.push(
        orch.signalingClient.onResponse((peerId) => {
          if (peerId !== orch.peerId) {
            console.error("Got response from someone else:", peerId);
            return;
          }

          refPeerId.current = peerId;
          const wrtcClient = new WebRTCClient(
            peerId,
            orch.signalingClient,
            true,
          );
          wrtcClient.onConnected(() => onReady());
          refWRTCClient.current = wrtcClient;
        }),
      );

      listeners.push(
        orch.signalingClient.onPeers((value) => setPeers([...value])),
      );
    }

    console.log("Start!");
    setLoading(true);
    setPeers([]);
    run()
      .catch((error: Error) => {
        setError(error);
        console.error("At AppInner run", error);
      })
      .then(() => setLoading(false));

    return () => {
      listeners.forEach((l) => l.unbind());
    };
  }, [ip, emoji]);

  if (loading) return "Loading...";
  if (error) return <div>Error! {error?.message}</div>;

  const handlePeerClick = (peer: ISignalingPeer) => {
    if (orch.peerId) {
      console.error("Already trying to establish peering. Can't peer to", peer);
      return;
    }

    orch.peerId = peer.id;
    orch.signalingClient.sendData(
      peer.id,
      SignalingType.Request,
      orch.signalingClient.id,
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
        ownId={orch.signalingClient.id}
        onClick={handlePeerClick}
      />

      {!autoDiscoveryEnabled && (
        <div role="alert" className="alert alert-warning mt-3">
          <span>Auto-discovery not available</span>
        </div>
      )}
    </div>
  );
};
