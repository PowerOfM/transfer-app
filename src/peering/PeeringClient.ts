import { Logger } from "../helpers/Logger";

export class PeeringClient {
  private readonly logger = new Logger("PeeringClient");

  public readonly channels: RTCDataChannel[] = [];

  constructor(
    public readonly connection: RTCPeerConnection,
    initialChannels: RTCDataChannel[]
  ) {
    this.connection.addEventListener("datachannel", this.handleDataChannel);
    this.connection.addEventListener(
      "negotiationneeded",
      this.handleNegotiationNeeded
    );
    this.connection.addEventListener(
      "connectionstatechange",
      this.handleConnectionStateChange
    );
    this.connection.addEventListener(
      "signalingstatechange",
      this.handleSignalingStateChanged
    );
    this.connection.addEventListener("track", this.handleTrack);

    for (const channel of initialChannels) {
      this.setupChannel(channel);
    }
  }

  private setupChannel(channel: RTCDataChannel) {
    channel.addEventListener("close", (ev: Event) =>
      this.logger.debug("channel-close", ev)
    );
    channel.addEventListener("closing", (ev: Event) =>
      this.logger.debug("channel-closing", ev)
    );
    channel.addEventListener("error", (ev: Event) =>
      this.logger.debug("channel-error", ev)
    );
    channel.addEventListener("message", (ev: MessageEvent) =>
      this.logger.debug("channel-message", ev)
    );
    channel.addEventListener("open", (ev: Event) =>
      this.logger.debug("channel-open", ev)
    );
    this.channels.push(channel);
  }

  private handleDataChannel = (ev: RTCDataChannelEvent) => {
    this.logger.debug("data-channel", ev);
  };
  private handleNegotiationNeeded = (ev: Event) => {
    this.logger.debug("negotiating-needed", ev);
  };
  private handleConnectionStateChange = (ev: Event) => {
    this.logger.debug("connection-state-changed", ev);
  };
  private handleSignalingStateChanged = (ev: Event) => {
    this.logger.debug("signaling-state-changed", ev);
  };
  private handleTrack = (ev: RTCTrackEvent) => {
    this.logger.debug("track", ev);
  };
}
