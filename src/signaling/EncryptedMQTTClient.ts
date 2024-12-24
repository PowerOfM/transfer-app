import mqtt from "mqtt"
import { EventEmitter } from "typed-event-emitter"
import { DataEncrypter } from "../helpers/DataEncrypter"
import { hash } from "../helpers/hash"
import { Logger } from "../helpers/Logger"

const VERBOSE = false

const DEV_MODE = window.location.hostname === "localhost"
const DEFAULT_BROKER = DEV_MODE
  ? "ws://localhost:8883"
  : "wss://broker.hivemq.com:8884/mqtt"
const CHANNEL_NAME_PREFIX = "ARDP"

const ID_STORAGE_KEY = "mqtt-client-id"
const ID_TIMESTAMP_KEY = "mqtt-client-id-timestamp"
const ID_EXPIRY_MS = 24 * 60 * 1000

type ClientStatus = "disconnected" | "connecting" | "connected" | "error"

/**
 * MQTT client that encrypts and decrypts messages.
 */
export class EncryptedMQTTClient extends EventEmitter {
  public onBroadcast = this.registerEvent<[string]>()
  public onConnect = this.registerEvent<[]>()
  public onData = this.registerEvent<[string]>()
  public onDecryptError = this.registerEvent<[Error]>()
  public onDisconnect = this.registerEvent<[number]>()
  public onError = this.registerEvent<[Error]>()

  public readonly id = this.createId()
  private readonly encrypter = new DataEncrypter()

  private logger = new Logger("MQTT")
  private client: mqtt.MqttClient
  private channelName: string | undefined

  private _status: ClientStatus = "connecting"
  public get status() {
    return this._status
  }

  public static async build(brokerUrl = DEFAULT_BROKER) {
    const client = new EncryptedMQTTClient(brokerUrl)
    await client.waitForConnection()
    return client
  }

  constructor(public readonly brokerUrl = DEFAULT_BROKER) {
    super()

    this.logger.debug("Connecting to broker", brokerUrl)
    this.client = mqtt.connect(brokerUrl)
    this.client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString())
    })
    this.client.on("error", (error) => {
      this.emit(this.onError, error)
      this._status = "error"
    })
    this.client.on("disconnect", (value) => {
      this.emit(this.onDisconnect, value.reasonCode)
      this._status = "disconnected"
    })
    this.client.on("connect", () => {
      this.emit(this.onConnect)
      this.logger.debug("Connected!")
      this._status = "connected"
    })
  }

  public async waitForConnection() {
    return new Promise<void>((resolve, reject) => {
      const errorHandler = this.onError(reject)
      this.onConnect(() => {
        errorHandler.unbind()
        resolve()
      })
    })
  }

  public getChannelName() {
    return this.channelName
  }

  public async setRoom(roomId: string, passkey: string) {
    const newChannelName = await this.buildChannelName(roomId)
    if (this.channelName !== newChannelName) {
      await this.unsubscribe()
    }

    await this.subscribe(newChannelName)
    await this.encrypter.buildPasskey(roomId, passkey)
  }

  public async leaveRoom() {
    return this.unsubscribe()
  }

  private async subscribe(channelName: string) {
    if (this.channelName === channelName) return
    if (this.channelName) {
      await this.unsubscribe()
    }

    await this.client.subscribeAsync(channelName)
    await this.client.subscribeAsync(channelName + "_" + this.id)
    this.channelName = channelName
  }

  private async unsubscribe() {
    if (!this.channelName) return

    await this.client?.unsubscribeAsync(this.channelName)
    await this.client?.unsubscribeAsync(this.channelName + "_" + this.id)
    this.channelName = ""
  }

  public async destroy() {
    await this.client.endAsync()
    this._status = "disconnected"
    this.channelName = undefined
  }

  public async send(data: string, to?: string) {
    if (!this.channelName) {
      throw new Error("Client not associated to a room")
    }
    const cypher = await this.encrypter.encrypt(data)

    const payload = cypher
    if (VERBOSE) this.logger.debug("Sending", payload)

    let channel = this.channelName
    if (to) channel += "_" + to
    return this.client.publishAsync(channel, payload)
  }

  private async handleMessage(channel: string, payload: string) {
    if (VERBOSE) this.logger.debug("Received", payload)

    let data
    try {
      data = await this.encrypter.decrypt(payload)
    } catch (error) {
      this.emit(this.onDecryptError, error)
      this.logger.error("Error decrypting message", error)
      return
    }

    const isDirect = channel.indexOf("_") >= 0
    this.emit(isDirect ? this.onData : this.onBroadcast, data)
  }

  private createId() {
    const now = Date.now()
    const storedId = localStorage.getItem(ID_STORAGE_KEY)
    const expiry = now - Number(localStorage.getItem(ID_TIMESTAMP_KEY))

    if (storedId && expiry < ID_EXPIRY_MS) {
      return storedId
    }

    const newId = crypto.randomUUID().replace(/-/g, "")
    localStorage.setItem(ID_STORAGE_KEY, newId)
    localStorage.setItem(ID_TIMESTAMP_KEY, now.toString())
    return newId
  }

  public async buildChannelName(roomId: string) {
    const date = new Date()
    const dateStr =
      String(date.getFullYear()).slice(2) +
      String(date.getMonth()) +
      date.getDate()

    const hashed = await hash(roomId + dateStr)
    return CHANNEL_NAME_PREFIX + hashed
  }
}
