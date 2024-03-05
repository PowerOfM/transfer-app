import { EventEmitter } from "typed-event-emitter";
import { EncryptedMQTTClient } from "./EncryptedMQTTClient";

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

const SIGNALING_PACKET_TYPES = [
  SignalingPacketType.Hello,
  SignalingPacketType.Welcome,
  SignalingPacketType.Data,
];

export class SignalingClient<T> extends EventEmitter {
  public onData = this.registerEvent<[string, T]>();
  public onUsers = this.registerEvent<[ISignalingUser[]]>();

  private users: ISignalingUser[] = [];

  constructor(
    private readonly client: EncryptedMQTTClient,
    private name: string
  ) {
    super();

    client.onData(this.handleData);
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
    data2?: unknown
  ) {
    const output = [data1];
    if (data2) output.push(data2);
    const jsonStr = JSON.stringify(output);

    await this.client.send(type + jsonStr);
  }

  private handleData = (fromId: string, data: string) => {
    const [type, data1, data2] = JSON.parse(data) as SignalingPacket;
    if (!SIGNALING_PACKET_TYPES.includes(type)) {
      console.error("[SIGNAL] Invalid packet type", type);
      return;
    }

    if (
      type === SignalingPacketType.Hello ||
      type === SignalingPacketType.Welcome
    ) {
      this.handleUserUpdate(type, fromId, data1);
    } else if (type === SignalingPacketType.Data) {
      this.handleDataUpdate(fromId, data1, data2);
    }
  };

  private handleUserUpdate(
    type: SignalingPacketType.Hello | SignalingPacketType.Welcome,
    id?: string,
    name?: string
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

    this.emit(this.onUsers, this.users);
  }

  private handleDataUpdate(fromId?: string, toId?: string, data?: unknown) {
    if (!fromId || !toId || !data) {
      console.error("Received invalid data", { fromId, toId, data });
      return;
    }
    if (toId !== this.client.id) return;
    this.emit(this.onData, fromId, data as T);
  }

  public static async build(ip: string, username: string, emojiKey: string) {
    const client = await EncryptedMQTTClient.build(ip, emojiKey);

    const signalingClient = new SignalingClient(client, username);
    await signalingClient.announce();

    return signalingClient;
  }
}
