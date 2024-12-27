import {
  AbstractPeeringFileChannel,
  IFileCommand,
} from "./AbstractPeeringFileChannel"

export class PeeringFileDownloadChannel extends AbstractPeeringFileChannel {
  public onDataComplete = this.registerEvent<[Blob]>()

  private protocol: "json" | "binary" = "json"
  private targetBufferSize: number = 0
  private receivedBufferSize: number = 0
  private receivedBuffer: ArrayBuffer[] = []

  constructor(channel: RTCDataChannel, public readonly fileId: string) {
    super(channel)
  }

  private waitUntilOpen() {
    if (this.channel.readyState === "open") return

    return new Promise<void>((resolve, reject) => {
      const listener = this.onClose(reject)
      this.onOpen(() => {
        listener.unbind()
        resolve()
      })
    })
  }

  public async start() {
    await this.waitUntilOpen()
    super.send({ type: "file-request", fileId: this.fileId })
  }

  protected processMessage(event: MessageEvent) {
    if (this.protocol === "json") {
      super.processMessage(event)
    } else {
      this.processBinaryMessage(event)
    }
  }

  protected processBinaryMessage(event: MessageEvent<ArrayBuffer>) {
    this.logger.debug(`Received ${event.data.byteLength} bytes of binary data`)

    this.receivedBufferSize += event.data.byteLength
    this.receivedBuffer.push(event.data)

    if (this.receivedBufferSize === this.targetBufferSize) {
      const fileBlob = new Blob(this.receivedBuffer)
      this.logger.debug(
        `Received file of size ${fileBlob.size} bytes. Closing transfer channel.`
      )
      this.emit(this.onDataComplete, fileBlob)
      this.channel.close()
    }
  }

  protected processCommand(command: IFileCommand) {
    switch (command.type) {
      case "ready-to-upload":
        this.targetBufferSize = command.bufferSize
        this.protocol = "binary"
        this.channel.binaryType = "arraybuffer"
        this.send({ type: "begin-binary" })
        break

      case "error":
        this.emit(
          this.onDataError,
          this,
          new Error("Received error: " + command.message)
        )
        this.channel.close()
        break

      default:
        this.logger.error("Received invalid command", command)
        this.channel.close()
        break
    }
  }
}
