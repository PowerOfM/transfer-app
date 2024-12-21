import { EventEmitter } from "typed-event-emitter";
import { Logger } from "../helpers/Logger";
import { IPeerConnection } from "../sharedTypes";
import { SignalingClient, SignalingType } from "./SignalingClient";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }],
};

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
    );

    return new Promise((resolve, reject) => {
      negotiator.onConnected((connection, channels) => {
        resolve({ connection, channels });
        negotiator.cleanup();
      });
      negotiator.onError((error) => {
        reject(error);
        negotiator.cleanup();
      });
    });
  }

  public onConnected =
    this.registerEvent<[RTCPeerConnection, RTCDataChannel[]]>();
  public onError = this.registerEvent<[Error]>();

  private readonly logger = new Logger("NegotiationClient");
  private connection: RTCPeerConnection;
  private channels: RTCDataChannel[] = [];

  constructor(
    private readonly peerId: string,
    private readonly signalingClient: SignalingClient,
    isInitiator: boolean
  ) {
    super();
    signalingClient.onOffer(this.handlePeerOffer);
    signalingClient.onAnswer(this.handlePeerAnswer);
    signalingClient.onCandidate(this.handlePeerCandidate);

    this.connection = new RTCPeerConnection(RTC_CONFIG);
    this.connection.addEventListener("icecandidate", this.handleIceCandidate);
    this.connection.addEventListener("datachannel", this.handleDataChannel);

    if (isInitiator) {
      this.createPeerOffer();
    }
  }

  public cleanup() {
    this.connection.removeEventListener(
      "icecandidate",
      this.handleIceCandidate
    );
    this.connection.removeEventListener("datachannel", this.handleDataChannel);
    this.channels.forEach((channel) => {
      channel.removeEventListener("error", this.handleChannelError);
      channel.removeEventListener("open", this.handleChannelOpen);
      channel.removeEventListener("close", this.handleChannelClose);
      channel.removeEventListener("message", this.handleChannelMessage);
    });
  }

  private setupChannel(channel: RTCDataChannel) {
    this.channels.push(channel);
    channel.addEventListener("error", this.handleChannelError);
    channel.addEventListener("open", this.handleChannelOpen);
    channel.addEventListener("close", this.handleChannelClose);
    channel.addEventListener("message", this.handleChannelMessage);
  }

  private createPeerOffer() {
    const channel = this.connection.createDataChannel("messenger");
    this.setupChannel(channel);

    const c = this.connection;
    c.createOffer()
      .then((offer) => c.setLocalDescription(offer))
      .then(() => {
        if (!c.localDescription) {
          this.logger.error("NO LOCAL DESCRIPTION!");
          return;
        }
        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Offer,
          c.localDescription
        );
      })
      .catch((err: Error) => {
        this.logger.error("Error creating peering offer:", err);
      });
  }

  private handlePeerOffer = (offer: RTCSessionDescriptionInit) => {
    const c = this.connection;

    c.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => c.createAnswer())
      .then((answer) => c.setLocalDescription(answer))
      .then(() => {
        if (!c.localDescription) {
          this.logger.error("NO LOCAL DESCRIPTION!");
          return;
        }

        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Answer,
          c.localDescription
        );
      })
      .catch((err: Error) => {
        this.logger.error("Error creating peering answer:", err);
      });
  };

  private handlePeerAnswer = (answer: RTCSessionDescriptionInit) => {
    this.connection.setRemoteDescription(new RTCSessionDescription(answer));
    this.logger.debug("Peer answer", answer);
  };

  private handlePeerCandidate = (candidate: RTCIceCandidate) => {
    this.connection.addIceCandidate(new RTCIceCandidate(candidate));
    this.logger.debug("Peer candidate", candidate);
  };

  private handleIceCandidate = ({ candidate }: RTCPeerConnectionIceEvent) => {
    if (!candidate) return;

    this.signalingClient.sendData(
      this.peerId,
      SignalingType.Candidate,
      candidate
    );
  };

  private handleDataChannel = (event: RTCDataChannelEvent) => {
    this.setupChannel(event.channel);
  };

  private handleChannelError = (ev: Event) => {
    this.logger.error("Data channel error", ev);
    this.emit(this.onError, new Error("Data channel error"));
  };

  private handleChannelOpen = (ev: Event) => {
    const channel = ev.target as RTCDataChannel;
    this.logger.debug("Data channel is open and ready to be used.", channel);
    this.emit(this.onConnected, this.connection, this.channels);
  };

  private handleChannelClose = (ev: Event) => {
    const channel = ev.target as RTCDataChannel;
    this.logger.debug("Data channel closed", channel);
  };

  private handleChannelMessage = (ev: MessageEvent) => {
    const channel = ev.target as RTCDataChannel;
    this.logger.debug("Data channel message", channel, ev.data);
  };
}
