import { useEffect, useState } from "react"
import { Badge } from "../components/Badge"
import { Button } from "../components/Button"
import { ConnectionPage } from "../components/ConnectionPage"
import { DiscoverIPHelper } from "../helpers/DiscoverIPHelper"
import { RandomGenerator } from "../helpers/RandomGenerator"
import { useAsync } from "../helpers/useAsync"
import { useLocalStorage } from "../helpers/useLocalStorage"
import { IPeerConnection } from "../sharedTypes"
import { EmojiSelectModal } from "./EmojiSelectModal"
import { RoomModal } from "./RoomModal"
import { ISignalingPeer } from "./SignalingClient"
import cl from "./SignalingPage.module.css"
import { SignalingPeerItem } from "./SignalingPeerItem"
import { useSignalingClient } from "./useSignalingClient"

interface IProps {
  onReady(result: IPeerConnection): void
}

export const SignalingPage = ({ onReady }: IProps) => {
  const [ipResult, ipLoading] = useAsync(() => DiscoverIPHelper.getIp())
  const [roomModalOpen, setRoomModalOpen] = useState(false)

  const [roomId, setRoomId] = useState<string | null>(null)
  const [emoji, setEmoji] = useLocalStorage("emoji", RandomGenerator.emoji())
  const [emojiModalOpen, setEmojiModalOpen] = useState(false)

  const client = useSignalingClient(roomId, emoji, onReady)

  useEffect(() => {
    if (ipLoading) return

    if (ipResult) {
      setRoomId(ipResult)
    } else {
      setRoomId((prev) => prev ?? crypto.randomUUID().slice(0, 8).toUpperCase())
    }
  }, [ipResult, ipLoading])

  if (client.error)
    return <div className="page">Error! {client.error?.message}</div>
  if (client.state === "signaling")
    return <ConnectionPage message="Waiting for other device" />
  if (client.state === "negotiating")
    return <ConnectionPage message="Negotiating secure connection" />

  const clientLoading = client.state === "loading"
  const handlePeerClick = (peer: ISignalingPeer) => {
    client.sendRequest(peer.id)
  }

  return (
    <div className="page">
      <div className={cl.header}>
        <h1>
          {clientLoading ? "Establishing Connection..." : "Connect to a Device"}
        </h1>
        <Badge color={clientLoading ? "grey" : "pink"}>MQTT</Badge>
      </div>

      <div className={cl.inputs}>
        <Button className={cl.discovery} onClick={() => setRoomModalOpen(true)}>
          {ipLoading ? (
            "Loading..."
          ) : roomId === ipResult ? (
            "Local Network Discovery"
          ) : (
            <>
              Key: <span className={cl.roomId}>{roomId}</span>
            </>
          )}
        </Button>

        <Button className={cl.emoji} onClick={() => setEmojiModalOpen(true)}>
          {emoji}
        </Button>
      </div>

      {client.peers.map((peer) => (
        <SignalingPeerItem
          key={peer.id}
          peer={peer}
          clientId={client.id ?? ""}
          onClick={handlePeerClick}
        />
      ))}

      <EmojiSelectModal
        initialValue={emoji}
        open={emojiModalOpen}
        onClose={(emoji) => {
          if (emoji) {
            setEmoji(emoji)
          }
          setEmojiModalOpen(false)
        }}
      />

      <RoomModal
        open={roomModalOpen}
        ipResult={ipResult}
        roomId={roomId}
        onClose={() => setRoomModalOpen(false)}
        onRoomKey={setRoomId}
      />
    </div>
  )
}
