import { EventEmitter } from "typed-event-emitter";
import { SignalingClient, SignalingType } from "./SignalingClient";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }],
};

export class WebRTCClient extends EventEmitter {
  public onConnected = this.registerEvent<[RTCDataChannel]>();
  public readonly channels: RTCDataChannel[] = [];

  private connection: RTCPeerConnection;

  constructor(
    public readonly peerId: string,
    public readonly signalingClient: SignalingClient,
    isInstigator = false,
  ) {
    super();
    signalingClient.onOffer(this.handlePeerOffer);
    signalingClient.onAnswer(this.handlePeerAnswer);
    signalingClient.onCandidate(this.handlePeerCandidate);

    this.connection = new RTCPeerConnection(RTC_CONFIG);
    this.connection.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      this.signalingClient.sendData(
        this.peerId,
        SignalingType.Candidate,
        candidate,
      );
    };
    this.connection.ondatachannel = (event) => {
      this.setChannel(event.channel);
    };

    if (isInstigator) {
      this.createPeerOffer();
    }
  }

  private setChannel(channel: RTCDataChannel) {
    channel.onerror = (error) => {
      console.error("[RTC] Data channel error", error);
    };
    channel.onopen = () => {
      console.log("[RTC] Data channel is open and ready to be used.");
      this.emit(this.onConnected, channel);
      this.channels.push(channel);
    };
    channel.onclose = () => {
      const i = this.channels.indexOf(channel);
      if (i >= 0) this.channels.splice(i, 1);
    };
    // channel.onmessage = ({ data }) => {
    //   this._handleChannelMessage(data);
    // };
  }

  private createPeerOffer() {
    const channel = this.connection.createDataChannel("messenger");
    this.setChannel(channel);

    const c = this.connection;
    c.createOffer()
      .then((offer) => c.setLocalDescription(offer))
      .then(() => {
        if (!c.localDescription) {
          console.error("NO LOCAL DESCRIPTION!");
          return;
        }
        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Offer,
          c.localDescription,
        );
      })
      .catch((err: Error) => {
        console.error("[RTC] Error creating peering offer:", err);
      });
  }

  private handlePeerOffer = (offer: RTCSessionDescriptionInit) => {
    const c = this.connection;

    c.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => c.createAnswer())
      .then((answer) => c.setLocalDescription(answer))
      .then(() => {
        if (!c.localDescription) {
          console.error("NO LOCAL DESCRIPTION!");
          return;
        }

        this.signalingClient.sendData(
          this.peerId,
          SignalingType.Answer,
          c.localDescription,
        );
      })
      .catch((err: Error) => {
        console.error("[RTC] Error creating peering answer:", err);
      });
  };

  private handlePeerAnswer = (answer: RTCSessionDescriptionInit) => {
    this.connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  private handlePeerCandidate = (candidate: RTCIceCandidate) => {
    this.connection.addIceCandidate(new RTCIceCandidate(candidate));
  };
}
