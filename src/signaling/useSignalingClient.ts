import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { Listener } from "typed-event-emitter"
import { Logger } from "../helpers/Logger"
import { IPeerConnection } from "../sharedTypes"
import { NegotiationClient } from "./NegotiationClient"
import {
  ISignalingPeer,
  SignalingClient,
  SignalingType,
} from "./SignalingClient"

type SignalingState = "loading" | "ready" | "signaling" | "negotiating"

const SIGNALING_TIMEOUT = 10000
const logger = new Logger("useSignalingClient")

/**
 * React hook to create a SignalingClient and manage its lifecycle.
 * @param roomId - The room ID to join.
 * @param emoji - The emoji to use for the room.
 * @param onReady - Callback function to call when the client is ready.
 */
export function useSignalingClient(
  mqttBroker: string | null,
  roomId: string | null,
  emoji: string,
  onReady: (result: IPeerConnection) => void
) {
  const clientRef = useRef<SignalingClient>()
  const refActivePeerId = useRef<string | null>(null)
  const refSignalingTimeout = useRef<number | null>(null)

  const [state, setState] = useState<SignalingState>("loading")
  const [error, setError] = useState<Error | null>(null)
  const [peers, setPeers] = useState<ISignalingPeer[]>([])

  useEffect(() => {
    clientRef.current = clientRef.current ?? new SignalingClient()
    const listeners: Listener[] = []

    async function run() {
      const client = clientRef.current
      if (!client) return

      const handleNegotiation = (peerId: string, isInitiator: boolean) => {
        setState("negotiating")
        const negotiator = new NegotiationClient(peerId, client, isInitiator)

        negotiator.onConnected((connection) => {
          negotiator.cleanup()
          client.destroy()
          onReady({ connection, isInitiator })
        })
        negotiator.onError((error) => {
          negotiator.cleanup()
          logger.error("Error negotiating", error)
          setState("ready")
          toast.error(
            "Couldn't negotiate with the other device. Check the console for more details."
          )
        })

        if (refSignalingTimeout.current) {
          clearTimeout(refSignalingTimeout.current)
        }

        refSignalingTimeout.current = window.setTimeout(() => {
          negotiator.cleanup()
          toast.error("Timed out waiting for negotiation to complete.")
          setState("ready")
        }, SIGNALING_TIMEOUT)
      }

      setPeers([...client.getPeers()])

      listeners.push(
        client.onRequest((peerId) => {
          if (refActivePeerId.current && peerId !== refActivePeerId.current) {
            logger.error(
              `Ignoring peer request from ${peerId}, because we are already trying to peer with ${refActivePeerId.current}.`
            )
            return
          }

          client.sendData(peerId, SignalingType.Response, client.id)

          refActivePeerId.current = peerId
          logger.debug("Peering ready with", peerId)
          handleNegotiation(peerId, false)
        })
      )

      listeners.push(
        client.onResponse((peerId) => {
          if (!refActivePeerId.current) {
            logger.error(
              `Ignoring peer response from ${peerId}, because we are not trying to peer with anyone.`
            )
            return
          }

          if (peerId !== refActivePeerId.current) {
            logger.error(
              `Ignoring peer response from ${peerId}, because we are already trying to peer with ${refActivePeerId.current}.`
            )
            return
          }

          logger.debug("Peer ready with", peerId)
          handleNegotiation(peerId, true)
        })
      )

      listeners.push(client.onPeers((value) => setPeers([...value])))

      listeners.push(
        client.onError((source, error) => {
          logger.error(`Error in ${source}:`, error)
          setError(error)
        })
      )
    }

    setState("loading")
    setPeers([])

    void run()
      .catch((error: Error) => {
        setError(new Error("Failed to set up the signaling client"))
        logger.error("Error in SignalingPage.run", error)
        toast.error(
          "Couldn't set up the signaling client. Check the console for more details."
        )
      })
      .then(() => setState("ready"))

    return () => {
      listeners.forEach((l) => l.unbind())

      if (refSignalingTimeout.current) {
        clearTimeout(refSignalingTimeout.current)
      }
    }
  }, [onReady])

  useEffect(() => {
    const client = clientRef.current
    if (!client || !mqttBroker) return

    client
      .connect(mqttBroker)
      .then(() => {
        if (roomId) client.setRoom(roomId, emoji)
      })
      .catch((error) => {
        logger.error("Error connecting to MQTT broker", error)
        toast.error(
          "Couldn't connect to the MQTT broker. Check the console for more details."
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mqttBroker])

  useEffect(() => {
    const client = clientRef.current
    if (!client) return

    if (roomId) {
      client.setRoom(roomId, emoji)
    }
  }, [roomId, emoji])

  const sendRequest = (peerId: string) => {
    const client = clientRef.current
    if (!client) return

    if (state !== "ready") {
      toast.error("Can't send request while loading.")
      return
    }

    setState("signaling")
    refActivePeerId.current = peerId
    client.sendData(peerId, SignalingType.Request, client.id)

    refSignalingTimeout.current = window.setTimeout(() => {
      toast.error("Timed out waiting for the other device to respond.")
      setState("ready")
    }, SIGNALING_TIMEOUT)
  }

  return { id: clientRef.current?.id, state, error, peers, sendRequest }
}
