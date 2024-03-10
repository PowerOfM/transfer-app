import { EventEmitter } from "typed-event-emitter";
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

export class SignalingClient extends EventEmitter {
  public onPeers = this.registerEvent<[ISignalingPeer[]]>();
  public onRequest = this.registerEvent<[SignalingPacketRequest[1]]>();
  public onResponse = this.registerEvent<[SignalingPacketResponse[1]]>();
  public onOffer = this.registerEvent<[SignalingPacketOffer[1]]>();
  public onAnswer = this.registerEvent<[SignalingPacketAnswer[1]]>();
  public onCandidate = this.registerEvent<[SignalingPacketCandidate[1]]>();

  private peers: ISignalingPeer[] = [];

  public get id() {
    return this.client.id;
  }

  constructor(
    private readonly client: EncryptedMQTTClient,
    private name: string
  ) {
    super();

    client.onBroadcast(this.handleBroadcast);
    client.onData(this.handleData);
    // TODO: handle errors
    // TODO: handle disconnect
  }

  public async destroy() {
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
      console.error("[SIGNAL] Invalid broadcast type", type);
      return;
    }
    if (!id || !name) {
      console.error("[SIGNAL] Invalid peer", { type, id, name });
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
      console.error("[SIGNAL] Invalid signaling type", type);
      return;
    }
    if (!payload) {
      console.error("[SIGNAL] Received invalid data", data);
      return;
    }

    // Emit specific events
    if (type === SignalingType.Request) {
      console.log("[SIGNAL] Received Request");
      this.emit(this.onRequest, payload);
    } else if (type === SignalingType.Response) {
      console.log("[SIGNAL] Received Response");
      this.emit(this.onResponse, payload);
    } else if (type === SignalingType.Offer) {
      console.log("[SIGNAL] Received Offer");
      this.emit(this.onOffer, payload);
    } else if (type === SignalingType.Answer) {
      console.log("[SIGNAL] Received Answer");
      this.emit(this.onAnswer, payload);
    } else if (type === SignalingType.Candidate) {
      console.log("[SIGNAL] Received Candidate");
      this.emit(this.onCandidate, payload);
    } else {
      console.error("[SIGNAL] Invalid type", type);
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

  public static async build(ip: string, username: string, emojiKey: string) {
    const client = await EncryptedMQTTClient.build(ip, emojiKey);

    const signalingClient = new SignalingClient(client, username);
    await signalingClient.sendHello();

    return signalingClient;
  }
}
