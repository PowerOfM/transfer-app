import { EventEmitter } from "typed-event-emitter";
import { Logger } from "../helpers/Logger";
import { RandomGenerator } from "../helpers/RandomGenerator";
import { EncryptedMQTTClient } from "./EncryptedMQTTClient";

enum BroadcastType {
  Hello = "!",
  Welcome = "#",
  Leave = "^",
}
const BROADCAST_TYPES = [
  BroadcastType.Hello,
  BroadcastType.Welcome,
  BroadcastType.Leave,
];

type BroadcastPacket =
  | [BroadcastType.Hello, string, string]
  | [BroadcastType.Welcome, string, string]
  | [BroadcastType.Leave, string];

export enum SignalingType {
  Request = ">",
  Response = "<",
  Offer = "o",
  Answer = "a",
  Candidate = "c",
}
const SIGNALING_TYPES = [
  SignalingType.Request,
  SignalingType.Response,
  SignalingType.Offer,
  SignalingType.Answer,
  SignalingType.Candidate,
];
type SignalingPacketRequest = [SignalingType.Request, string];
type SignalingPacketResponse = [SignalingType.Response, string];
type SignalingPacketOffer = [SignalingType.Offer, RTCSessionDescriptionInit];
type SignalingPacketAnswer = [SignalingType.Answer, RTCSessionDescriptionInit];
type SignalingPacketCandidate = [SignalingType.Candidate, RTCIceCandidate];
type SignalingPacket =
  | SignalingPacketRequest
  | SignalingPacketResponse
  | SignalingPacketOffer
  | SignalingPacketAnswer
  | SignalingPacketCandidate;

export interface ISignalingPeer {
  id: string;
  name: string;
  ts: number;
}

export enum ErrorSource {
  MQTTClient = "MQTTClient",
  Signaling = "Signaling",
}

/**
 * Signaling client that wraps an MQTT client to exchange messages with other peers.
 * Defines a protocol for exchanging messages with other peers for discovery and WebRTC negotiation.
 */
export class SignalingClient extends EventEmitter {
  public onPeers = this.registerEvent<[ISignalingPeer[]]>();
  public onRequest = this.registerEvent<[SignalingPacketRequest[1]]>();
  public onResponse = this.registerEvent<[SignalingPacketResponse[1]]>();
  public onOffer = this.registerEvent<[SignalingPacketOffer[1]]>();
  public onAnswer = this.registerEvent<[SignalingPacketAnswer[1]]>();
  public onCandidate = this.registerEvent<[SignalingPacketCandidate[1]]>();
  public onError = this.registerEvent<[ErrorSource, Error]>();

  private logger = new Logger("SignalingClient");
  private client = new EncryptedMQTTClient();
  private peers: ISignalingPeer[] = [];
  private name: string = RandomGenerator.name();

  public readonly id = this.client.id;

  constructor() {
    super();
    this.logger.debug("Instance created");

    this.client.onBroadcast(this.handleBroadcast);
    this.client.onData(this.handleData);
    this.client.onError((error) =>
      this.emit(this.onError, ErrorSource.MQTTClient, error)
    );
    // TODO: handle disconnect
  }

  public async destroy() {
    this.logger.debug("Ending client");
    await this.send([BroadcastType.Leave, this.client.id, this.name]);
    await this.client.destroy();
  }

  public getName() {
    return this.name;
  }

  public setName(name: string) {
    this.name = name;
    this.sendWelcome();
  }

  public getPeers() {
    return this.peers;
  }

  public async connect(brokerUrl?: string) {
    await this.client.connect(brokerUrl);
  }

  public async setRoom(roomId: string, passkey: string) {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }

    await this.client.setRoom(roomId, passkey);
    await this.sendHello();
    this.peers = [];
    this.emit(this.onPeers, this.peers);
  }

  public async leaveRoom() {
    return this.client.leaveRoom();
  }

  /**
   * Broadcast greeting to the channel
   */
  public async sendHello() {
    return this.send([BroadcastType.Hello, this.client.id, this.name]);
  }

  /**
   * Broadcast response to "Hello" to channel (or updated name)
   */
  public async sendWelcome() {
    this.send([BroadcastType.Welcome, this.client.id, this.name]);
  }

  /**
   * Send data to a specific client
   */
  public async sendData(
    to: string,
    type: SignalingPacket[0],
    data: SignalingPacket[1]
  ) {
    this.send([type, data], to);
  }

  private async send(data: unknown, to?: string) {
    const jsonStr = JSON.stringify(data);
    await this.client.send(jsonStr, to);
  }

  private handleBroadcast = (data: string) => {
    const [type, id, name] = JSON.parse(data) as BroadcastPacket;

    // Validate
    if (!BROADCAST_TYPES.includes(type)) {
      this.logger.error("Invalid broadcast type", type);
      return;
    }
    if (!id || !name) {
      this.logger.error("Invalid peer", { type, id, name });
      return;
    }

    // Respond to "Hello" messages with a warm welcome
    if (type === BroadcastType.Hello) this.sendWelcome();

    this.updatePeers(id, name, type === BroadcastType.Leave);
    this.emit(this.onPeers, this.peers);
  };

  private handleData = (data: string) => {
    const [type, payload] = JSON.parse(data) as SignalingPacket;

    // Validate
    if (!SIGNALING_TYPES.includes(type)) {
      this.logger.error("Invalid signaling type", type);
      return;
    }
    if (!payload) {
      this.logger.error("Received invalid data", data);
      return;
    }

    // Emit specific events
    if (type === SignalingType.Request) {
      this.logger.debug("Received Request");
      this.emit(this.onRequest, payload);
    } else if (type === SignalingType.Response) {
      this.logger.debug("Received Response");
      this.emit(this.onResponse, payload);
    } else if (type === SignalingType.Offer) {
      this.logger.debug("Received Offer");
      this.emit(this.onOffer, payload);
    } else if (type === SignalingType.Answer) {
      this.logger.debug("Received Answer");
      this.emit(this.onAnswer, payload);
    } else if (type === SignalingType.Candidate) {
      this.logger.debug("Received Candidate");
      this.emit(this.onCandidate, payload);
    } else {
      this.logger.error("Invalid type", type);
    }
  };

  private updatePeers(id: string, name: string, hasLeft: boolean) {
    const existingIndex = this.peers.findIndex((entry) => entry.id === id);
    if (hasLeft) {
      if (existingIndex >= 0) {
        this.peers.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex >= 0) {
        this.peers[existingIndex].name = name;
        this.peers[existingIndex].ts = Date.now();
      } else {
        this.peers.push({ id, name, ts: Date.now() });
      }
    }
  }
}
