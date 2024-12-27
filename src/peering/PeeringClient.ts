import toast from "react-hot-toast"
import { EventEmitter } from "typed-event-emitter"
import { Logger } from "../helpers/Logger"
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
  public onFileUpdated = this.registerEvent<[IFileOffered | IFileReceived]>()
  public onStateChange = this.registerEvent<[PeeringState]>()

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
  }

  public initiate() {
    this.setupCommandChannel(this.connection.createDataChannel("command"))
  }

  public destroy() {
    this.removeListener()
    this.connection.close()
    this.connection.removeEventListener("datachannel", this.handleDataChannel)
    this.connection.removeEventListener(
      "connectionstatechange",
      this.handleConnectionStateChange
    )

    if (this.commandChannel) {
      this.commandChannel.destroy()
    }
    this.transferChannels.forEach((channel) => channel.destroy())

    this.state = PeeringState.Disconnected
  }

  public sendMessage(message: string): void {
    this.sendCommand({ type: "message", message })
  }

  public sendFileOffer(file: File): string {
    const id = crypto.randomUUID()
    this.filesOffered.push({ id, file })

    const metadata = { type: file.type, name: file.name, size: file.size }
    this.sendCommand({ type: "file", file: { id, metadata } })
    return id
  }

  public sendFileAccept(fileId: string): void {
    const targetFile = this.filesReceived.find((file) => file.id === fileId)
    if (!targetFile) {
      throw new Error("File not found in received list")
    }

    const downloadChannel = new PeeringFileDownloadChannel(
      this.connection.createDataChannel("transfer-" + fileId),
      targetFile
    )
    downloadChannel.onDataComplete(() => {
      this.emit(this.onFileUpdated, targetFile)
    })
    downloadChannel.onOpen(() => {
      targetFile.progressSignal = new Signal<number>()
      downloadChannel.start()
      this.emit(this.onFileUpdated, targetFile)
    })

    this.setupTransferChannel(downloadChannel)
  }

  private sendCommand(command: ICommand): void {
    if (!this.commandChannel) {
      throw new Error("Command channel not found")
    }
    this.commandChannel.send(command)
  }

  private setupCommandChannel(channel: RTCDataChannel) {
    const commandChannel = new PeeringCommandChannel(channel)
    commandChannel.onMessage((message) => {
      this.emit(this.onMessage, message)
    })
    commandChannel.onFileReceived((file) => {
      this.filesReceived.push(file)
      this.emit(this.onFileReceived, file)
    })
    commandChannel.onClose(() => {
      this.logger.warn("Command channel closed!", commandChannel.id)
      this.state = PeeringState.Disconnected
    })
    commandChannel.onOpen(() => {
      this.logger.debug("Command channel ready", commandChannel.id)
      this.state = PeeringState.Open
    })
    this.commandChannel = commandChannel
  }

  private setupTransferChannel(channel: AbstractPeeringFileChannel) {
    channel.onClose(this.handleChannelClose)
    channel.onDataError(this.handleChannelDataError)
    channel.onError(this.handleChannelError)
    this.transferChannels.push(channel)
  }

  private removeTransferChannel(channel: AbstractPeeringFileChannel) {
    channel.destroy()
    this.transferChannels.splice(this.transferChannels.indexOf(channel), 1)
  }

  private handleDataChannel = (ev: RTCDataChannelEvent) => {
    this.logger.debug("New data channel", ev.channel.id, ev.channel.label)

    if (!this.commandChannel) {
      this.setupCommandChannel(ev.channel)
    } else {
      const uploadChannel = new PeeringFileUploadChannel(
        ev.channel,
        this.filesOffered
      )
      uploadChannel.onUploadStarted((file) => {
        this.emit(this.onFileUpdated, file)
      })
      this.setupTransferChannel(uploadChannel)
    }
  }

  private handleConnectionStateChange = (ev: Event) => {
    this.logger.debug("connection-state-changed", ev)
    if (this.connection.connectionState === "closed") {
      this.state = PeeringState.Disconnected
    }
  }

  private handleChannelClose = (
    channel: AbstractPeeringFileChannel,
    ev: Event
  ) => {
    this.logger.debug("Transfer channel closed.", channel.label, ev)
    this.removeTransferChannel(channel)
  }

  private handleChannelDataError = (
    channel: AbstractPeeringFileChannel,
    error: Error
  ) => {
    this.logger.warn("Transfer channel data error", channel.label, error)
    toast.error("Error: " + error.message)
  }

  private handleChannelError = (
    channel: AbstractPeeringFileChannel,
    ev: Event
  ) => {
    this.logger.warn("Transfer channel error", channel.label, ev)
  }
}
