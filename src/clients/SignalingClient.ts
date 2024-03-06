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

interface ISignalingUser {
  id: string;
  name: string;
  ts: number;
}

export class SignalingClient<T> extends EventEmitter {
  public onData = this.registerEvent<[string, T]>();
  public onUsers = this.registerEvent<[ISignalingUser[]]>();

  private users: ISignalingUser[] = [];

  constructor(
    private readonly client: EncryptedMQTTClient,
    private name: string,
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
  public async sendData(to: string, data: unknown) {
    this.send(data, to);
  }

  private async send(data: unknown, to?: string) {
    const jsonStr = JSON.stringify(data);
    await this.client.send(jsonStr, to);
  }

  private handleBroadcast = (data: string) => {
    const [type, id, name] = JSON.parse(data) as BroadcastPacket;

    // Validate
    if (!BROADCAST_TYPES.includes(type)) {
      console.error("[SIGNALING] Invalid broadcast type", type);
      return;
    }
    if (!id || !name) {
      console.error("[SIGNALING] Invalid user", { type, id, name });
      return;
    }

    // Respond to "Hello" messages with a warm welcome
    if (type === BroadcastType.Hello) this.sendWelcome();

    this.updateUsers(id, name, type === BroadcastType.Leave);
    this.emit(this.onUsers, this.users);
  };

  private handleData = (data: string) => {
    const [fromId, payload] = JSON.parse(data);

    // Validate
    if (!fromId || !payload) {
      console.error("Received invalid data", data);
      return;
    }

    this.emit(this.onData, fromId, data as T);
  };

  private updateUsers(id: string, name: string, hasLeft: boolean) {
    const existingIndex = this.users.findIndex((entry) => entry.id === id);
    if (hasLeft) {
      if (existingIndex >= 0) {
        this.users.splice(existingIndex, 1);
      }
    } else {
      if (existingIndex >= 0) {
        this.users[existingIndex].name = name;
        this.users[existingIndex].ts = Date.now();
      } else {
        this.users.push({ id, name, ts: Date.now() });
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
