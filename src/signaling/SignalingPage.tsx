import clsx from "clsx";
import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ConnectionPage } from "../components/ConnectionPage";
import { EmojiSelectModal } from "../components/EmojiSelectModal";
import { DiscoverIPHelper } from "../helpers/DiscoverIPHelper";
import { RandomGenerator } from "../helpers/RandomGenerator";
import { useAsync } from "../helpers/useAsync";
import { useLocalStorage } from "../helpers/useLocalStorage";
import { IPeerConnection } from "../sharedTypes";
import { ISignalingPeer } from "./SignalingClient";
import cl from "./SignalingPage.module.css";
import { useSignalingClient } from "./useSignalingClient";

interface IProps {
  onReady(result: IPeerConnection): void;
}

export const SignalingPage = ({ onReady }: IProps) => {
  const [ipResult, ipLoading] = useAsync(() => DiscoverIPHelper.getIp());
  const [autoDiscoveryEnabled, setAutoDiscoveryEnabled] = useState(false);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [emoji, setEmoji] = useLocalStorage("emoji", RandomGenerator.emoji());
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);

  const client = useSignalingClient(roomId, emoji, onReady);

  useEffect(() => {
    if (ipLoading) return;

    if (ipResult) {
      setRoomId(ipResult);
      setAutoDiscoveryEnabled(true);
    } else {
      setRoomId((prev) => prev ?? crypto.randomUUID());
      setAutoDiscoveryEnabled(false);
    }
  }, [ipResult, ipLoading]);

  if (client.error)
    return <div className="page">Error! {client.error?.message}</div>;
  if (client.state === "signaling")
    return <ConnectionPage message="Waiting for other device" />;
  if (client.state === "negotiating")
    return <ConnectionPage message="Negotiating secure connection" />;

  const clientLoading = client.state === "loading";
  const handlePeerClick = (peer: ISignalingPeer) => {
    client.sendRequest(peer.id);
  };

  return (
    <div className="page">
      <div className={cl.header}>
        <h1>
          {clientLoading ? "Establishing Connection..." : "Connect to a Device"}
        </h1>
        <Badge color={clientLoading ? "grey" : "pink"}>MQTT</Badge>
      </div>

      <div className={cl.inputs}>
        <Button className={cl.discovery}>
          {ipLoading
            ? "Loading..."
            : autoDiscoveryEnabled
            ? "Local Network Discovery"
            : "Manual Connection"}
        </Button>

        <Button className={cl.emoji} onClick={() => setEmojiModalOpen(true)}>
          {emoji}
        </Button>
      </div>

      {client.peers.map((peer) => {
        const isYou = peer.id === client.id || peer.id === "1";
        return (
          <div
            key={peer.id}
            className={clsx(cl.peer, isYou && cl.disabled)}
            onClick={() => !isYou && handlePeerClick(peer)}
          >
            <div
              className={cl.dot}
              style={{ backgroundColor: peer.name.split("-")[0] }}
            />
            {peer.name} {isYou && "(you)"}
          </div>
        );
      })}

      <EmojiSelectModal
        initialValue={emoji}
        open={emojiModalOpen}
        onClose={(emoji) => {
          if (emoji) {
            setEmoji(emoji);
          }
          setEmojiModalOpen(false);
        }}
      />
    </div>
  );
};
