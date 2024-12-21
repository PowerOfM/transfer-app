import { useEffect, useRef, useState } from "react";
import { Listener } from "typed-event-emitter";
import { Logger } from "../helpers/Logger";
import { IPeerConnection } from "../sharedTypes";
import { NegotiationClient } from "./NegotiationClient";
import {
  ISignalingPeer,
  SignalingClient,
  SignalingType,
} from "./SignalingClient";

type SignalingState = "loading" | "ready" | "signaling" | "negotiating";

const SIGNALING_TIMEOUT = 10000;
const logger = new Logger("useSignalingClient");

/**
 * React hook to create a SignalingClient and manage its lifecycle.
 * @param roomId - The room ID to join.
 * @param emoji - The emoji to use for the room.
 * @param onReady - Callback function to call when the client is ready.
 */
export function useSignalingClient(
  roomId: string | null,
  emoji: string,
  onReady: (result: IPeerConnection) => void
) {
  const clientRef = useRef<SignalingClient>();
  useEffect(() => {
    clientRef.current = new SignalingClient();
  }, []);

  const [state, setState] = useState<SignalingState>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [peers, setPeers] = useState<ISignalingPeer[]>([]);

  const refActivePeerId = useRef<string | null>(null);
  const refSignalingTimeout = useRef<number | null>(null);

  useEffect(() => {
    logger.debug("Updating client", roomId, emoji);
    const listeners: Listener[] = [];

    async function run() {
      const client = clientRef.current;
      if (!client) return;

      // If there's no roomId, just start the connection
      if (!roomId) {
        await client.connect();
        return;
      }

      const handleNegotiation = (peerId: string, isInitiator: boolean) => {
        setState("negotiating");
        NegotiationClient.negotiate(peerId, client, isInitiator)
          .then((result) => {
            logger.debug("Negotiation result", result);
            client.destroy();
            onReady(result);
          })
          .catch((error) => {
            logger.error("Error negotiating", error);
            setState("ready");
            setError(error);
          });
      };

      await client.setRoom(roomId, emoji);
      setPeers([...client.getPeers()]);

      listeners.push(
        client.onRequest((peerId) => {
          if (refActivePeerId.current && peerId !== refActivePeerId.current) {
            logger.error(
              `Ignoring peer request from ${peerId}, because we are already trying to peer with ${refActivePeerId.current}.`
            );
            return;
          }

          client.sendData(peerId, SignalingType.Response, client.id);

          refActivePeerId.current = peerId;
          logger.debug("Peering ready with", peerId);
          handleNegotiation(peerId, false);
          // onReady({
          //   peerId,
          //   signalingClient: client,
          //   isInitiator: false,
          // });
          // const webRTCClient = new WebRTCClient(peerId, client);
          // webRTCClient.onConnected(() => onReady());
          // refWebRTCClient.current = webRTCClient;
        })
      );

      listeners.push(
        client.onResponse((peerId) => {
          if (!refActivePeerId.current) {
            logger.error(
              `Ignoring peer response from ${peerId}, because we are not trying to peer with anyone.`
            );
            return;
          }

          if (peerId !== refActivePeerId.current) {
            logger.error(
              `Ignoring peer response from ${peerId}, because we are already trying to peer with ${refActivePeerId.current}.`
            );
            return;
          }

          logger.debug("Peer ready with", peerId);
          handleNegotiation(peerId, true);
          // onReady({
          //   peerId,
          //   signalingClient: client,
          //   isInitiator: true,
          // });
          // refActivePeerId.current = peerId;
          // const webRTCClient = new WebRTCClient(peerId, client, true);
          // webRTCClient.onConnected(() => onReady());
          // refWebRTCClient.current = webRTCClient;
        })
      );

      listeners.push(client.onPeers((value) => setPeers([...value])));

      listeners.push(
        client.onError((source, error) => {
          logger.error(`Error in ${source}:`, error);
          setError(error);
        })
      );
    }

    setState("loading");
    setPeers([]);

    void run()
      .catch((error: Error) => {
        setError(error);
        logger.error("Error in SignalingPage.run", error);
      })
      .then(() => setState("ready"));

    return () => {
      listeners.forEach((l) => l.unbind());

      if (refSignalingTimeout.current) {
        clearTimeout(refSignalingTimeout.current);
      }
    };
  }, [roomId, emoji, onReady]);

  const sendRequest = (peerId: string) => {
    const client = clientRef.current;
    if (!client) return;

    if (state !== "ready") {
      logger.warn("Can't peer while loading.");
      return;
    }

    setState("signaling");
    refActivePeerId.current = peerId;
    client.sendData(peerId, SignalingType.Request, client.id);

    refSignalingTimeout.current = window.setTimeout(() => {
      setState("ready");
    }, SIGNALING_TIMEOUT);
  };

  return { id: clientRef.current?.id, state, error, peers, sendRequest };
}
