import { useEffect, useState } from "react"
import { Badge } from "../components/Badge"
import { Button } from "../components/Button"
import { ConnectionPage } from "../components/ConnectionPage"
import { RandomGenerator } from "../helpers/RandomGenerator"
import { useAsync } from "../helpers/useAsync"
import { useLocalStorage } from "../helpers/useLocalStorage"
import { IPeerConnection } from "../sharedTypes"
import { EmojiSelectModal } from "./EmojiSelectModal"
import { DEFAULT_MQTT_BROKER } from "./EncryptedMQTTClient"
import { MQTTModal } from "./MQTTModal"
import { RoomModal } from "./RoomModal"
import { ISignalingPeer } from "./SignalingClient"
import cl from "./SignalingPage.module.css"
import { SignalingPeerItem } from "./SignalingPeerItem"
import { STUNClient } from "./STUNClient"
import { useSignalingClient } from "./useSignalingClient"

interface IProps {
  onReady(result: IPeerConnection): void
}

export const SignalingPage = ({ onReady }: IProps) => {
  const [ipResult, ipLoading] = useAsync(() => STUNClient.getIp())
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [emojiModalOpen, setEmojiModalOpen] = useState(false)
  const [mqttModalOpen, setMQTTModalOpen] = useState(false)
  const [triedDirectConnect, setTriedDirectConnect] = useState(false)

  const [mqttBroker, setMqttBroker] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [emoji, setEmoji] = useLocalStorage("emoji", RandomGenerator.emoji())

  const client = useSignalingClient(mqttBroker, roomId, emoji, onReady)

  useEffect(() => {
    const url = new URL(window.location.href)
    const key = url.searchParams.get("k")
    if (!key) return

    const inputEmoji = url.searchParams.get("e")
    if (inputEmoji && inputEmoji !== emoji) {
      setEmoji(inputEmoji)
    }

    setRoomId(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const peerId = url.searchParams.get("p")
    if (
      peerId &&
      client.state === "ready" &&
      client.peers.length === 2 &&
      !triedDirectConnect
    ) {
      client.sendRequest(peerId)
      setTriedDirectConnect(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  useEffect(() => {
    if (ipLoading || roomId) return

    if (ipResult) {
      setRoomId(ipResult)
    } else {
      setRoomId((prev) => prev ?? crypto.randomUUID().slice(0, 8).toUpperCase())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Badge
          color={clientLoading ? "grey" : "pink"}
          onClick={() => setMQTTModalOpen(true)}
        >
          MQTT
        </Badge>
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

      <div className={cl.peersList}>
        {client.peers.map((peer) => (
          <SignalingPeerItem
            key={peer.id}
            peer={peer}
            clientId={client.id ?? ""}
            onClick={handlePeerClick}
          />
        ))}
      </div>

      <div className={cl.hint}>
        {clientLoading ? (
          <p>
            <b>Not connecting?</b> Tap the MQTT badge to try a different public
            server or enter your own private MQTT server host.
          </p>
        ) : (
          <p>
            <b>Don't see the right device?</b> Make sure your symbol at the top
            matches. If you're on different networks, tap "Local Network
            Discovery" to try a direct connection.
          </p>
        )}
        <p className={cl.createdBy}>
          Created by <a href="https://github.com/powerofm">Mesbah Mowlavi</a>
        </p>
      </div>

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
        emoji={emoji}
        clientId={client.id}
        ipResult={ipResult}
        roomId={roomId ?? undefined}
        onClose={() => setRoomModalOpen(false)}
        onRoomKey={setRoomId}
      />

      <MQTTModal
        open={mqttModalOpen}
        value={mqttBroker || DEFAULT_MQTT_BROKER}
        onClose={() => setMQTTModalOpen(false)}
        onChange={setMqttBroker}
      />
    </div>
  )
}
