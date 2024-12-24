import { EventEmitter } from "typed-event-emitter"
import { Logger } from "../helpers/Logger"
import { IPeerConnection } from "../sharedTypes"
import { SignalingClient, SignalingType } from "./SignalingClient"

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }],
}

/**
 * Negotiates an RTCPeerConnection using the signaling client to exchange ICE candidates and offers/answers.
 * It also creates a data channel called "messenger".
 *
 * Use the `negotiate` method to get a promise that resolves with established peer connection and channels.
 */
export class NegotiationClient extends EventEmitter {
  public static negotiate(
    peerId: string,
    signalingClient: SignalingClient,
    isInitiator: boolean
  ): Promise<IPeerConnection> {
    const negotiator = new NegotiationClient(
      peerId,
      signalingClient,
      isInitiator
    )

    return new Promise((resolve, reject) => {
      negotiator.onConnected((connection) => {
        resolve({ connection, isInitiator })
        negotiator.cleanup()
      })
      negotiator.onError((error) => {
        reject(error)
        negotiator.cleanup()
      })
    })
  }

  public onConnected = this.registerEvent<[RTCPeerConnection]>()
  public onError = this.registerEvent<[Error]>()

  private readonly logger = new Logger("NegotiationClient")
  private connection: RTCPeerConnection
  private messengerChannel: RTCDataChannel | null = null

  constructor(
    private readonly peerId: string,
    private readonly signalingClient: SignalingClient,
    isInitiator: boolean
  ) {
    super()
    signalingClient.onOffer(this.handlePeerOffer)
    signalingClient.onAnswer(this.handlePeerAnswer)
    signalingClient.onCandidate(this.handlePeerCandidate)

    this.connection = new RTCPeerConnection(RTC_CONFIG)
    this.connection.addEventListener("icecandidate", this.handleIceCandidate)
    this.connection.addEventListener("datachannel", this.handleDataChannel)

    // TODO: listen and respond to negotiationneeded?

    if (isInitiator) {
      this.logger.debug("Initiating negotiation with peer", this.peerId)
      this.createPeerOffer()
    } else {
      this.logger.debug("Waiting for peer offer from", this.peerId)
    }
  }

  public cleanup() {
    this.logger.debug("Negotiation complete. Cleaning up negotiation client")
    this.connection.removeEventListener(
      "icecandidate",
      this.handleIceCandidate
    )
    this.connection.removeEventListener("datachannel", this.handleDataChannel)

    if (this.messengerChannel) {
      this.messengerChannel.removeEventListener(
        "error",
        this.handleChannelError
      )
      this.messengerChannel.removeEventListener("open", this.handleChannelOpen)
      this.messengerChannel.removeEventListener(
        "close",
        this.handleChannelClose
      )
    }
  }

  private setupChannel(channel: RTCDataChannel) {
    this.messengerChannel = channel
    channel.addEventListener("error", this.handleChannelError)
    channel.addEventListener("open", this.handleChannelOpen)
    channel.addEventListener("close", this.handleChannelClose)
  }

  private createPeerOffer() {
    // TODO: is creating a channel even necessary?
    const channel = this.connection.createDataChannel("messenger")
    this.setupChannel(channel)

    const c = this.connection
    c.createOffer()
      .then((offer) => c.setLocalDescription(offer))
      .then(() => {
        if (!c.localDescription) {
          this.logger.error("NO LOCAL DESCRIPTION!")
          return
        }
        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Offer,
          c.localDescription
        )
      })
      .catch((err: Error) => {
        this.logger.error("Error creating peering offer:", err)
      })
  }

  private handlePeerOffer = (offer: RTCSessionDescriptionInit) => {
    const c = this.connection

    c.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => c.createAnswer())
      .then((answer) => c.setLocalDescription(answer))
      .then(() => {
        if (!c.localDescription) {
          this.logger.error("NO LOCAL DESCRIPTION!")
          return
        }

        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Answer,
          c.localDescription
        )
      })
      .catch((err: Error) => {
        this.logger.error("Error creating peering answer:", err)
      })
  }

  private handlePeerAnswer = (answer: RTCSessionDescriptionInit) => {
    this.connection.setRemoteDescription(new RTCSessionDescription(answer))
    this.logger.debug("Peer answer", answer)
  }

  private handlePeerCandidate = (candidate: RTCIceCandidate) => {
    this.connection.addIceCandidate(new RTCIceCandidate(candidate))
    this.logger.debug("Peer candidate", candidate)
  }

  private handleIceCandidate = ({ candidate }: RTCPeerConnectionIceEvent) => {
    if (!candidate) return

    this.signalingClient.sendData(
      this.peerId,
      SignalingType.Candidate,
      candidate
    )
  }

  private handleDataChannel = (event: RTCDataChannelEvent) => {
    this.setupChannel(event.channel)
  }

  private handleChannelError = (ev: Event) => {
    this.logger.error("Data channel error", ev)
    this.emit(this.onError, new Error("Data channel error"))
  }

  private handleChannelOpen = (ev: Event) => {
    const channel = ev.target as RTCDataChannel
    this.logger.debug("Data channel is open and ready to be used.", channel)
    channel.close()
    this.emit(this.onConnected, this.connection)
  }

  private handleChannelClose = (ev: Event) => {
    const channel = ev.target as RTCDataChannel
    this.logger.debug("Data channel closed", channel)
  }
}
