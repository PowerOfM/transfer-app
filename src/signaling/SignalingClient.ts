import { EventEmitter } from "typed-event-emitter"
import { Logger } from "../helpers/Logger"
import { RandomGenerator } from "../helpers/RandomGenerator"
import { EncryptedMQTTClient } from "./EncryptedMQTTClient"

const VERBOSE = false

enum BroadcastType {
  Hello = "👋",
  Welcome = "😄",
  Leave = "🍃",
}
const BROADCAST_TYPES = [
  BroadcastType.Hello,
  BroadcastType.Welcome,
  BroadcastType.Leave,
]

export enum DeviceType {
  Mobile = "mobile",
  Desktop = "desktop",
}

type BroadcastPacket =
  | [BroadcastType.Hello, string, string, DeviceType, number]
  | [BroadcastType.Welcome, string, string, DeviceType, number]
  | [BroadcastType.Leave, string]

export enum SignalingType {
  Request = "🕊️",
  Response = "🥰",
  Offer = "🙋",
  Answer = "💃",
  Candidate = "🤝",
}
const SIGNALING_TYPES = [
  SignalingType.Request,
  SignalingType.Response,
  SignalingType.Offer,
  SignalingType.Answer,
  SignalingType.Candidate,
]
type SignalingPacketRequest = [SignalingType.Request, string]
type SignalingPacketResponse = [SignalingType.Response, string]
type SignalingPacketOffer = [SignalingType.Offer, RTCSessionDescriptionInit]
type SignalingPacketAnswer = [SignalingType.Answer, RTCSessionDescriptionInit]
type SignalingPacketCandidate = [SignalingType.Candidate, RTCIceCandidate]
type SignalingPacket =
  | SignalingPacketRequest
  | SignalingPacketResponse
  | SignalingPacketOffer
  | SignalingPacketAnswer
  | SignalingPacketCandidate

export interface ISignalingPeer {
  id: string
  name: string
  deviceType: DeviceType
  ts: number
}

export enum ErrorSource {
  MQTTClient = "MQTTClient",
  Signaling = "Signaling",
}

const SECONDS = 1000
const DISCONNECT_INTERVAL = 5 * 60 * SECONDS
const UPDATE_PEERS_INTERVAL = 15 * SECONDS

/**
 * Signaling client that wraps an MQTT client to exchange messages with other peers.
 * Defines a protocol for exchanging messages with other peers for discovery and WebRTC negotiation.
 */
export class SignalingClient extends EventEmitter {
  public onPeers = this.registerEvent<[ISignalingPeer[]]>()
  public onRequest = this.registerEvent<[SignalingPacketRequest[1]]>()
  public onResponse = this.registerEvent<[SignalingPacketResponse[1]]>()
  public onOffer = this.registerEvent<[SignalingPacketOffer[1]]>()
  public onAnswer = this.registerEvent<[SignalingPacketAnswer[1]]>()
  public onCandidate = this.registerEvent<[SignalingPacketCandidate[1]]>()
  public onError = this.registerEvent<[ErrorSource, Error]>()

  private logger = new Logger("SignalingClient")
  private client: EncryptedMQTTClient
  private peers: ISignalingPeer[] = []
  private name: string = RandomGenerator.name()

  private joinTs: number = Date.now()
  private deviceType: DeviceType = window.navigator.userAgent.includes("Mobile")
    ? DeviceType.Mobile
    : DeviceType.Desktop

  private currentRoomKey: string | undefined

  private updatePeersTimer: number = 0
  private disconnectTimer: number = 0

  public get id() {
    return this.client.id
  }

  constructor() {
    super()

    this.client = new EncryptedMQTTClient()
    this.setupClient()
    this.setupTimers()
    this.logger.debug("Initialized")
  }

  public async destroy(graceful = false) {
    this.removeListener()
    window.clearInterval(this.updatePeersTimer)
    window.clearInterval(this.disconnectTimer)

    if (graceful && this.currentRoomKey) {
      await this.send([BroadcastType.Leave, this.client.id])
    }

    await this.client.destroy()
    this.logger.debug("Ended Signaling and MQTT client")
  }

  public getName() {
    return this.name
  }

  public setName(name: string) {
    this.name = name
    this.sendWelcome()
  }

  public getPeers() {
    return this.peers
  }

  public async connect() {
    this.client = await EncryptedMQTTClient.build()
    this.setupClient()
  }

  public async setRoom(roomId: string, passkey: string) {
    await this.waitForClient()

    if (this.currentRoomKey && this.currentRoomKey !== roomId + passkey) {
      await this.leaveRoom()
    }

    await this.client.setRoom(roomId, passkey)
    await this.sendHello()

    this.currentRoomKey = roomId + passkey
    this.peers = []
    this.emit(this.onPeers, this.peers)
  }

  public async leaveRoom() {
    this.currentRoomKey = undefined
    await this.send([BroadcastType.Leave, this.client.id])
    await this.client.leaveRoom()
  }

  /**
   * Broadcast greeting to the channel
   */
  public async sendHello() {
    return this.send([
      BroadcastType.Hello,
      this.client.id,
      this.name,
      this.deviceType,
      this.joinTs,
    ])
  }

  /**
   * Broadcast response to "Hello" to channel (or updated name)
   */
  public async sendWelcome() {
    this.send([
      BroadcastType.Welcome,
      this.client.id,
      this.name,
      this.deviceType,
      this.joinTs,
    ])
  }

  /**
   * Send data to a specific client
   */
  public async sendData(
    to: string,
    type: SignalingPacket[0],
    data: SignalingPacket[1]
  ) {
    this.send([type, data] as SignalingPacket, to)
  }

  private async send(data: BroadcastPacket | SignalingPacket, to?: string) {
    const jsonStr = JSON.stringify(data)
    await this.client.send(jsonStr, to)
  }

  private waitForClient() {
    if (this.client.status === "open") return
    if (
      this.client.status === "error" ||
      this.client.status === "disconnected"
    ) {
      return this.connect()
    }
    if (this.client.status === "connecting") {
      return this.client.waitForConnection()
    }
    throw new Error("Unexpected client status: " + this.client.status)
  }

  private setupClient() {
    this.client.onBroadcast(this.handleBroadcast)
    this.client.onData(this.handleData)
    this.client.onError((error) =>
      this.emit(this.onError, ErrorSource.MQTTClient, error)
    )
  }

  private setupTimers() {
    this.updatePeersTimer = window.setInterval(() => {
      this.updatePeersList()
    }, UPDATE_PEERS_INTERVAL)

    this.disconnectTimer = window.setInterval(() => {
      this.destroy(true)
      this.emit(
        this.onError,
        ErrorSource.Signaling,
        new Error(
          "Disconnected from signaling server due to inactivity. Please refresh to try again."
        )
      )
    }, DISCONNECT_INTERVAL)
  }

  private handleBroadcast = (data: string) => {
    const [type, id, name, deviceType, ts] = JSON.parse(data) as BroadcastPacket

    // Validate
    if (!BROADCAST_TYPES.includes(type)) {
      this.logger.error("Invalid broadcast type", type)
      return
    }
    if (!id || !name) {
      this.logger.error("Invalid peer", { type, id, name })
      return
    }
    if (!deviceType || !Object.values(DeviceType).includes(deviceType)) {
      this.logger.error("Invalid device type", deviceType)
      return
    }

    // Respond to "Hello" messages with a warm welcome
    if (type === BroadcastType.Hello) this.sendWelcome()

    this.updatePeer(
      id,
      name,
      deviceType,
      Number(ts) || Date.now(),
      type === BroadcastType.Leave
    )
    this.emit(this.onPeers, this.peers)
  }

  private handleData = (data: string) => {
    const [type, payload] = JSON.parse(data) as SignalingPacket

    // Validate
    if (!SIGNALING_TYPES.includes(type)) {
      this.logger.error("Invalid signaling type", type)
      return
    }
    if (!payload) {
      this.logger.error("Received invalid data", data)
      return
    }

    // Emit specific events
    if (type === SignalingType.Request) {
      if (VERBOSE) this.logger.debug("Received Request")
      this.emit(this.onRequest, payload)
    } else if (type === SignalingType.Response) {
      if (VERBOSE) this.logger.debug("Received Response")
      this.emit(this.onResponse, payload)
    } else if (type === SignalingType.Offer) {
      if (VERBOSE) this.logger.debug("Received Offer")
      this.emit(this.onOffer, payload)
    } else if (type === SignalingType.Answer) {
      if (VERBOSE) this.logger.debug("Received Answer")
      this.emit(this.onAnswer, payload)
    } else if (type === SignalingType.Candidate) {
      if (VERBOSE) this.logger.debug("Received Candidate")
      this.emit(this.onCandidate, payload)
    } else {
      this.logger.error("Invalid type", type)
    }
  }

  private updatePeer(
    id: string,
    name: string,
    deviceType: DeviceType,
    ts: number,
    hasLeft: boolean
  ) {
    const existingIndex = this.peers.findIndex((entry) => entry.id === id)
    if (hasLeft) {
      if (existingIndex >= 0) {
        this.peers.splice(existingIndex, 1)
      }
    } else {
      if (existingIndex >= 0) {
        this.peers[existingIndex].name = name
        this.peers[existingIndex].ts = ts
      } else {
        this.peers.push({ id, name, deviceType, ts })
      }
    }
    this.peers.sort((a, b) => a.ts - b.ts)
  }

  private updatePeersList() {
    const prevLength = this.peers.length
    this.peers = this.peers.filter(
      (peer) => peer.ts > Date.now() - DISCONNECT_INTERVAL
    )

    if (this.peers.length !== prevLength) {
      this.emit(this.onPeers, this.peers)
    }
  }
}
