import mqtt from "mqtt";
import { EventEmitter } from "./EventEmitter";
import { weakHash } from "./CryptoHelpers";
import { MQTTCrypto } from "./MQTTCrypto";

type SignalingClientEvents = "data";

const DEFAULT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const CHANNEL_NAME_PREFIX = "ARDP";

export class SignalingClient extends EventEmitter<SignalingClientEvents> {
  constructor(
    private readonly client: mqtt.MqttClient,
    private readonly mqttCrypto: MQTTCrypto,
    public readonly ip: string,
    public readonly channelName: string
  ) {
    super();
    client.on("message", (_topic, payload) => {
      this.handlePayload(payload.toString()).catch((err) => {
        // TODO: handle error
        // TODO: this.emit('error', err)
        void err;
      });
    });
    // TODO: handle errors
    // TODO: handle disconnect
  }

  public async send(data: Record<string, unknown>) {
    const jsonStr = JSON.stringify(data);
    const payload = await this.mqttCrypto.encode(jsonStr);
    this.client.publishAsync(this.channelName, payload);
  }

  private async handlePayload(payload: string) {
    const jsonStr = await this.mqttCrypto.decode(payload);
    const data = JSON.parse(jsonStr);
    this.emit("data", data);
  }

  public static async build(
    ip: string,
    emojiKey: string,
    brokerUrl: string = DEFAULT_BROKER
  ) {
    const channelName = await this.getChannelName(ip);
    const mqttCrypto = await MQTTCrypto.build(ip, emojiKey);

    const client = await mqtt.connectAsync(brokerUrl);
    await client.subscribeAsync(channelName);

    return new SignalingClient(client, mqttCrypto, ip, channelName);
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
