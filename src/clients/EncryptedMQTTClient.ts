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
  private readonly encrypter = new DataEncrypter();

  private client: mqtt.MqttClient | undefined;
  private roomId: string | undefined;
  private channelName: string | undefined;

  public async connect(brokerUrl = DEFAULT_BROKER) {
    if (this.client) {
      await this.destroy();
    }

    const client = await mqtt.connectAsync(brokerUrl);
    client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });
    client.on("error", (error) => {
      this.emit(this.onError, error);
    });
    client.on("disconnect", (value) => {
      this.emit(this.onDisconnect, value.reasonCode);
    });

    this.client = client;
    console.log("connected!");
  }

  public isConnected() {
    return !!this.client;
  }

  public getChannelName() {
    return this.channelName;
  }

  public getRoomId() {
    return this.roomId;
  }

  public async setRoom(roomId: string, passkey: string) {
    if (this.roomId !== roomId) {
      this.roomId = roomId;
      const newChannelName = await this.buildChannelName(roomId);
      await this.subscribe(newChannelName);
    }

    await this.encrypter.buildPasskey(roomId, passkey);
  }

  public async leaveRoom() {
    return this.unsubscribe();
  }

  public async subscribe(channelName: string) {
    if (!this.client) {
      throw new Error("Client not connected");
    }

    if (this.channelName === channelName) return;
    if (this.channelName) {
      await this.unsubscribe();
    }

    await this.client.subscribeAsync(channelName);
    await this.client.subscribeAsync(channelName + "_" + this.id);
    this.channelName = channelName;
  }

  public async unsubscribe() {
    if (!this.channelName) return;

    await this.client?.unsubscribeAsync(this.channelName);
    await this.client?.unsubscribeAsync(this.channelName + "_" + this.id);
    this.channelName = "";
  }

  public async destroy() {
    const client = this.client;
    if (client) {
      this.client = undefined;
      await client.endAsync();
    }

    this.roomId = undefined;
    this.channelName = undefined;
  }

  public async send(data: string, to?: string) {
    if (!this.client || !this.channelName) {
      throw new Error("Client not connected");
    }
    const cypher = await this.encrypter.encrypt(data);

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
      data = await this.encrypter.decrypt(payload);
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

  public async buildChannelName(roomId: string) {
    const date = new Date();
    const dateStr =
      String(date.getFullYear()).slice(2) +
      String(date.getMonth()) +
      date.getDate();

    const hashed = await hash(roomId + dateStr);
    return CHANNEL_NAME_PREFIX + hashed;
  }
}
