import mqtt from "mqtt";
import { EventEmitter } from "./EventEmitter";
import { weakHash } from "./CryptoHelpers";
import { EncryptionHelper } from "./EncryptionHelper";

enum SignalingPacketType {
  Hello = "!",
  Welcome = "#",
  Data = "^",
}
type SignalingPacket =
  | [SignalingPacketType.Hello, string, string]
  | [SignalingPacketType.Welcome, string, string]
  | [SignalingPacketType.Data, string, string, unknown];

interface ISignalingUser {
  id: string;
  name: string;
  ts: number;
}

type SignalingClientEvents = "data" | "users";

const ID_LEN = 32;
const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const CHANNEL_NAME_PREFIX = "ARDP";
const SIGNALING_PACKET_TYPES = [
  SignalingPacketType.Hello,
  SignalingPacketType.Welcome,
  SignalingPacketType.Data,
];

export class SignalingClient extends EventEmitter<SignalingClientEvents> {
  private id = this.createId();
  private users: ISignalingUser[] = [];

  constructor(
    private readonly client: mqtt.MqttClient,
    private readonly encryptionHelper: EncryptionHelper,
    public readonly ip: string,
    public readonly channelName: string,
    private name: string,
  ) {
    super();

    client.on("message", (_topic, payload) => {
      const data = payload.toString();
      console.log("[SIGNAL] Received", _topic, data);
      this.handlePayload(data).catch((error) => {
        // TODO: handle error
        console.error("[SIGNAL] Handling error", error);
      });
    });
    // TODO: handle errors
    // TODO: handle disconnect
  }

  public getName() {
    return this.name;
  }

  public setName(name: string) {
    this.name = name;
    this.send(SignalingPacketType.Welcome, name);
  }

  public async announce() {
    return this.send(SignalingPacketType.Hello, this.name);
  }

  public async send(
    type: SignalingPacketType,
    data1: unknown,
    data2?: unknown,
  ) {
    const jsonStr = JSON.stringify([data1, data2].filter((i) => !!i));

    const cypher = await this.encryptionHelper.encrypt(jsonStr);
    const payload = this.id + type + cypher;
    console.log("[SIGNAL] Sending", payload);
    return this.client.publishAsync(this.channelName, payload);
  }

  private async handlePayload(payload: string) {
    const id = payload.slice(0, ID_LEN);
    if (id === this.id) return;

    const type = payload[ID_LEN] as SignalingPacketType;
    if (!SIGNALING_PACKET_TYPES.includes(type)) {
      console.error("[SIGNAL] Invalid packet type", type);
      return;
    }

    const jsonStr = await this.encryptionHelper.decrypt(
      payload.slice(ID_LEN + 2),
    );
    const [data1, data2] = JSON.parse(jsonStr) as SignalingPacket;
    console.log("[SIGNAL] Received", id, type, data1, data2);

    if (
      type === SignalingPacketType.Hello ||
      type === SignalingPacketType.Welcome
    ) {
      this.handleUserUpdate(type, id, data1);
    } else if (type === SignalingPacketType.Data) {
      this.handleDataUpdate(id, data1, data2);
    }
  }

  private handleUserUpdate(
    type: SignalingPacketType.Hello | SignalingPacketType.Welcome,
    id?: string,
    name?: string,
  ) {
    if (!id || !name) {
      console.error("Received invalid user update", { type, id, name });
      return;
    }

    const existingIndex = this.users.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      this.users[existingIndex].name = name;
      this.users[existingIndex].ts = Date.now();
    } else {
      this.users.push({ id, name, ts: Date.now() });
    }

    if (type === SignalingPacketType.Hello) {
      this.send(SignalingPacketType.Welcome, this.name);
    }

    this.emit("users", this.users);
  }

  private handleDataUpdate(fromId?: string, toId?: string, data?: unknown) {
    if (!fromId || !toId || !data) {
      console.error("Received invalid data", { fromId, toId, data });
      return;
    }
    if (toId !== this.id) return;
    this.emit("data", { from: fromId, data });
  }

  private createId() {
    return crypto.randomUUID().replace(/-/g, "");
  }

  public static async build(
    ip: string,
    username: string,
    emojiKey: string,
    brokerUrl: string = DEFAULT_BROKER,
  ) {
    const channelName = await this.getChannelName(ip);
    const mqttCrypto = await EncryptionHelper.build(ip, emojiKey);

    const client = await mqtt.connectAsync(brokerUrl);
    await client.subscribeAsync(channelName);

    const signalingClient = new SignalingClient(
      client,
      mqttCrypto,
      ip,
      channelName,
      username,
    );
    await signalingClient.announce();

    return signalingClient;
  }

  public static async getChannelName(ip: string) {
    const date = new Date();
    const dateStr =
      date.getFullYear().toString().slice(2) +
      date.getMonth().toString() +
      date.getDate();

    const hashed = await weakHash(ip + dateStr);
    return CHANNEL_NAME_PREFIX + hashed;
  }
}
