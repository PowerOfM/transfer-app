import { EventEmitter } from "typed-event-emitter"
import { Logger } from "../helpers/Logger"
import { RTCSpeedMonitor } from "../helpers/RTCSpeedMonitor"
import { Signal } from "../helpers/Signal"
import {
  AbstractPeeringFileChannel,
  IFileOffered,
  IFileReceived,
} from "./channels/AbstractPeeringFileChannel"
import {
  ICommand,
  PeeringCommandChannel,
} from "./channels/PeeringCommandChannel"
import { PeeringFileDownloadChannel } from "./channels/PeeringFileDownloadChannel"
import { PeeringFileUploadChannel } from "./channels/PeeringFileUploadChannel"

export enum PeeringState {
  Connecting = "connecting",
  Open = "open",
  Disconnected = "disconnected",
}

export class PeeringClient extends EventEmitter {
  private readonly logger = new Logger("PeeringClient")

  public onError = this.registerEvent<[Error]>()
  public onMessage = this.registerEvent<[string]>()
  public onFileReceived = this.registerEvent<[IFileReceived]>()
  public onStateChange = this.registerEvent<[PeeringState]>()
  public onFileDownloadStarted = this.registerEvent<[IFileReceived]>()
  public onFileDownloadComplete = this.registerEvent<[IFileReceived, Blob]>()

  private commandChannel: PeeringCommandChannel | null = null
  private readonly transferChannels: AbstractPeeringFileChannel[] = []

  private readonly filesOffered: IFileOffered[] = []
  private readonly filesReceived: IFileReceived[] = []

  private _state: PeeringState = PeeringState.Connecting
  public get state() {
    return this._state
  }
  private set state(state: PeeringState) {
    this._state = state
    this.emit(this.onStateChange, state)
  }

  constructor(public readonly connection: RTCPeerConnection) {
    super()

    this.connection.addEventListener("datachannel", this.handleDataChannel)
    this.connection.addEventListener(
      "connectionstatechange",
      this.handleConnectionStateChange
    )
    this.connection.addEventListener("track", this.handleTrack)
  }

  public initiate() {
    this.setupCommandChannel(this.connection.createDataChannel("command"))
  }

  public destroy() {
    this.connection.close()
    this.connection.removeEventListener("datachannel", this.handleDataChannel)
    this.connection.removeEventListener(
      "connectionstatechange",
      this.handleConnectionStateChange
    )
    this.connection.removeEventListener("track", this.handleTrack)

    if (this.commandChannel) {
      this.commandChannel.destroy()
    }
    this.transferChannels.forEach((channel) => {
      this.cleanupChannel(channel)
    })

    this.state = PeeringState.Disconnected
  }

  public sendMessage(message: string): void {
    this.sendCommand({ type: "message", message })
  }

  public sendFileOffer(file: File): string {
    const id = crypto.randomUUID()
    this.filesOffered.push({ id, file })

    this.sendCommand({
      type: "file",
      file: {
        id,
        metadata: {
          type: file.type,
          name: file.name,
          size: file.size,
        },
      },
    })
    return id
  }

  public sendFileAccept(fileId: string): void {
    const targetFile = this.filesReceived.find((file) => file.id === fileId)
    if (!targetFile) {
      throw new Error("File not found in received list")
    }

    const progressSignal = new Signal<number>()
    targetFile.progressSignal = progressSignal

    const speedMonitor = new RTCSpeedMonitor(
      this.connection,
      targetFile.metadata.size,
      progressSignal
    )

    const downloadChannel = new PeeringFileDownloadChannel(
      this.connection.createDataChannel("transfer-" + fileId),
      fileId
    )
    downloadChannel.onDataComplete((blob) => {
      targetFile.blob = blob
      this.emit(this.onFileDownloadComplete, targetFile, blob)
      this.saveFile(targetFile)
    })
    downloadChannel.onClose(() => {
      this.logger.debug("Download channel closed", fileId)
      speedMonitor.stop()
    })

    this.addTransferChannel(downloadChannel)
    this.emit(this.onFileDownloadStarted, targetFile)
    downloadChannel.start()
    speedMonitor.start()
  }

  private sendCommand(command: ICommand): void {
    if (!this.commandChannel) {
      throw new Error("Command channel not found")
    }
    this.commandChannel.send(command)
  }

  private setupCommandChannel(channel: RTCDataChannel) {
    this.commandChannel = new PeeringCommandChannel(channel)
    this.commandChannel.onMessage((message) => {
      this.emit(this.onMessage, message)
    })
    this.commandChannel.onFileReceived((file) => {
      this.filesReceived.push(file)
      this.emit(this.onFileReceived, file)
    })

    this.logger.debug("Command channel ready", this.commandChannel.id)
    this.state = PeeringState.Open
  }

  private addTransferChannel(channel: AbstractPeeringFileChannel) {
    channel.onError(this.handleChannelError)
    channel.onClose(this.handleChannelClose)
    channel.onDataError(this.handleChannelDataError)
    this.transferChannels.push(channel)
  }

  private removeTransferChannel(channel: AbstractPeeringFileChannel) {
    this.cleanupChannel(channel)
    this.transferChannels.splice(this.transferChannels.indexOf(channel), 1)
  }

  private cleanupChannel(channel: AbstractPeeringFileChannel) {
    channel.removeListener(this.handleChannelClose)
    channel.removeListener(this.handleChannelError)
    channel.removeListener(this.handleChannelDataError)
  }

  private handleDataChannel = (ev: RTCDataChannelEvent) => {
    this.logger.debug("New data channel", ev.channel.id, ev.channel.label)

    if (!this.commandChannel) {
      this.setupCommandChannel(ev.channel)
    } else {
      const transferChannel = new PeeringFileUploadChannel(
        ev.channel,
        this.filesOffered
      )
      this.addTransferChannel(transferChannel)
    }
  }
  private handleConnectionStateChange = (ev: Event) => {
    this.logger.debug("connection-state-changed", ev)
    if (this.connection.connectionState === "closed") {
      this.state = PeeringState.Disconnected
    }
  }
  private handleTrack = (ev: RTCTrackEvent) => {
    this.logger.debug("track", ev)
  }

  private handleChannelClose = (
    channel: AbstractPeeringFileChannel,
    ev: Event
  ) => {
    if (this.commandChannel?.id === channel.id) {
      this.logger.error("Command channel closed!", ev)
      this.state = PeeringState.Disconnected
    } else {
      this.logger.debug("Transfer channel closed.", channel.id, channel.label)
      this.removeTransferChannel(channel)
    }
  }
  private handleChannelError = (
    channel: AbstractPeeringFileChannel,
    ev: Event
  ) => {
    this.logger.warn("channel-error", channel.id, channel.label, ev)
  }

  private handleChannelDataError = (
    channel: AbstractPeeringFileChannel,
    error: Error
  ) => {
    this.logger.warn("channel-data-error", channel.id, channel.label, error)
  }

  private saveFile(receivedFile: IFileReceived) {
    if (!receivedFile.blob) return

    // Download file to client
    const file = new File([receivedFile.blob], receivedFile.metadata.name, {
      type: receivedFile.metadata.type,
    })
    const downloadUrl = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = file.name
    a.click()
  }
}
