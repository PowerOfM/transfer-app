import mqtt from "mqtt";
import { EventEmitter } from "typed-event-emitter";
import { weakHash } from "./CryptoHelpers";
import { EncryptionHelper } from "./EncryptionHelper";

const ID_LEN = 32;
const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const CHANNEL_NAME_PREFIX = "ARDP";

export class EncryptedMQTTClient extends EventEmitter {
  public onData = this.registerEvent<[string, string]>();
  public onError = this.registerEvent<[Error]>();
  public onDecryptError = this.registerEvent<[Error]>();
  public onDisconnect = this.registerEvent<[number]>();

  public readonly id = this.createId();

  constructor(
    private readonly client: mqtt.MqttClient,
    private readonly encryptionHelper: EncryptionHelper,
    public readonly ip: string,
    public readonly channelName: string
  ) {
    super();

    client.on("message", (_topic, payload) => {
      const data = payload.toString();
      this.handleMessage(data);
    });
    client.on("error", (error) => {
      this.emit(this.onError, error);
    });
    client.on("disconnect", (value) => {
      this.emit(this.onDisconnect, value.reasonCode);
    });
  }

  public async send(data: string) {
    const cypher = await this.encryptionHelper.encrypt(data);

    const payload = this.id + cypher;
    console.log("[MQTT] Sending", payload);

    return this.client.publishAsync(this.channelName, payload);
  }

  private async handleMessage(payload: string) {
    const id = payload.slice(0, ID_LEN);
    if (id === this.id) return;
    console.log("[MQTT] Received", payload);

    let data;
    try {
      data = await this.encryptionHelper.decrypt(payload.slice(ID_LEN));
    } catch (error) {
      this.emit(this.onDecryptError, error);
      console.error("[MQTT] Handling error", error);
      return;
    }

    this.emit(this.onData, id, data);
  }

  private createId() {
    return crypto.randomUUID().replace(/-/g, "");
  }

  public static async build(
    ip: string,
    emojiKey: string,
    brokerUrl: string = DEFAULT_BROKER
  ) {
    const channelName = await this.getChannelName(ip);
    const encryptionHelper = await EncryptionHelper.build(ip, emojiKey);

    const client = await mqtt.connectAsync(brokerUrl);
    await client.subscribeAsync(channelName);

    const signalingClient = new EncryptedMQTTClient(
      client,
      encryptionHelper,
      ip,
      channelName
    );

    return signalingClient;
  }

  public static async getChannelName(ip: string) {
    const date = new Date();
    const dateStr =
      String(date.getFullYear()).slice(2) +
      String(date.getMonth()) +
      date.getDate();

    const hashed = await weakHash(ip + dateStr);
    return CHANNEL_NAME_PREFIX + hashed;
  }
}
