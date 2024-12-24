import { EventEmitter } from "typed-event-emitter"
import { Logger } from "../../helpers/Logger"

export abstract class PeeringChannel<
  T extends object = object
> extends EventEmitter {
  public onOpen = this.registerEvent<[PeeringChannel, Event]>()
  public onClose = this.registerEvent<[PeeringChannel, Event]>()
  public onError = this.registerEvent<[PeeringChannel, Event]>()
  public onDataError = this.registerEvent<[PeeringChannel, Error]>()

  protected readonly logger = new Logger("PeeringChannel")

  public get id() {
    return this.channel.id
  }

  public get label() {
    return this.channel.label
  }

  constructor(protected readonly channel: RTCDataChannel) {
    super()
    this.channel.addEventListener("message", this.handleMessage)
    this.channel.addEventListener("open", this.handleOpen)
    this.channel.addEventListener("close", this.handleClose)
    this.channel.addEventListener("error", this.handleError)
  }

  public destroy() {
    this.channel.removeEventListener("message", this.handleMessage)
    this.channel.removeEventListener("open", this.handleOpen)
    this.channel.removeEventListener("close", this.handleClose)
    this.channel.removeEventListener("error", this.handleError)
  }

  public send(data: T): void {
    if (!this.validateCommand(data)) {
      this.logger.error("Attempting to send invalid command", data)
      throw new Error("Attempting to send invalid command")
    }
    this.channel.send(JSON.stringify(data))
    this.channel.protocol
  }

  protected handleJsonMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as unknown
      if (!this.validateCommand(data)) {
        this.logger.error("Invalid message format received:", data)
        this.emit(this.onDataError, this, new Error("Invalid message format"))
        return
      }
      this.processCommand(data)
    } catch (error) {
      this.logger.error("Error processing message:", error)
      this.emit(this.onDataError, this, error as Error)
    }
  }

  protected abstract validateCommand(data: unknown): data is T
  protected abstract processCommand(data: T): void

  protected handleMessage = (event: MessageEvent) => {
    this.handleJsonMessage(event)
  }

  protected handleOpen = (event: Event) => {
    this.emit(this.onOpen, this, event)
  }

  protected handleClose = (event: Event) => {
    this.emit(this.onClose, this, event)
  }

  protected handleError = (event: Event) => {
    this.emit(this.onError, this, event)
  }
}
