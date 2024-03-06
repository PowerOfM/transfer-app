import mqtt from "mqtt";
import { EventEmitter } from "typed-event-emitter";
import { hash } from "../helpers/hash";
import { DataEncrypter } from "../helpers/DataEncrypter";

const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const CHANNEL_NAME_PREFIX = "ARDP";

export class EncryptedMQTTClient extends EventEmitter {
  public onData = this.registerEvent<[string]>();
  public onBroadcast = this.registerEvent<[string]>();
  public onError = this.registerEvent<[Error]>();
  public onDecryptError = this.registerEvent<[Error]>();
  public onDisconnect = this.registerEvent<[number]>();

  public readonly id = this.createId();

  constructor(
    private readonly client: mqtt.MqttClient,
    private readonly encypter: DataEncrypter,
    public readonly ip: string,
    public readonly channelName: string,
  ) {
    super();

    client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });
    client.on("error", (error) => {
      this.emit(this.onError, error);
    });
    client.on("disconnect", (value) => {
      this.emit(this.onDisconnect, value.reasonCode);
    });

    console.log("ID", this.id);
  }

  private async init() {
    this.client.subscribeAsync(this.channelName);
    this.client.subscribeAsync(this.channelName + "_" + this.id);
  }

  public async destroy() {
    return this.client.endAsync();
  }

  public async send(data: string, to?: string) {
    const cypher = await this.encypter.encrypt(data);

    const payload = cypher;
    console.log("[MQTT] Sending", payload);

    let channel = this.channelName;
    if (to) channel += "_" + to;
    return this.client.publishAsync(channel, payload);
  }

  private async handleMessage(channel: string, payload: string) {
    console.log("[MQTT] Received", payload);

    let data;
    try {
      data = await this.encypter.decrypt(payload);
    } catch (error) {
      this.emit(this.onDecryptError, error);
      console.error("[MQTT] Handling error", error);
      return;
    }

    const isDirect = channel.indexOf("_") >= 0;
    this.emit(isDirect ? this.onData : this.onBroadcast, data);
  }

  private createId() {
    return crypto.randomUUID().replace(/-/g, "");
  }

  public static async build(
    ip: string,
    emojiKey: string,
    brokerUrl: string = DEFAULT_BROKER,
  ) {
    const channelName = await this.getChannelName(ip);
    const encryptionHelper = await DataEncrypter.build(ip, emojiKey);
    const client = await mqtt.connectAsync(brokerUrl);

    const signalingClient = new EncryptedMQTTClient(
      client,
      encryptionHelper,
      ip,
      channelName,
    );
    await signalingClient.init();

    return signalingClient;
  }

  public static async getChannelName(ip: string) {
    const date = new Date();
    const dateStr =
      String(date.getFullYear()).slice(2) +
      String(date.getMonth()) +
      date.getDate();

    const hashed = await hash(ip + dateStr);
    return CHANNEL_NAME_PREFIX + hashed;
  }
}
