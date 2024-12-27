import toast from "react-hot-toast"
import { FileSaver } from "../../helpers/FileSaver"
import { Signal } from "../../helpers/Signal"
import {
  AbstractPeeringFileChannel,
  IFileCommand,
  IFileReceived,
} from "./AbstractPeeringFileChannel"

export class PeeringFileDownloadChannel extends AbstractPeeringFileChannel {
  public onDataComplete = this.registerEvent<[]>()

  private protocol: "json" | "binary" = "json"
  private targetBufferSize: number = 0
  private receivedBufferSize: number = 0
  private receivedBuffer: ArrayBuffer[] = []

  constructor(
    channel: RTCDataChannel,
    public readonly requestedFile: IFileReceived
  ) {
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
    super.send({ type: "file-request", fileId: this.requestedFile.id })
  }

  protected processMessage(event: MessageEvent) {
    if (this.protocol === "json") {
      super.processMessage(event)
    } else {
      this.processBinaryMessage(event)
    }
  }

  protected processBinaryMessage(event: MessageEvent<ArrayBuffer>) {
    if (!this.ensureActive(this.requestedFile.progressSignal)) {
      return
    }

    this.receivedBufferSize += event.data.byteLength
    this.receivedBuffer.push(event.data)
    this.requestedFile.progressSignal?.emit(
      Math.floor((this.receivedBufferSize / this.targetBufferSize) * 100)
    )

    if (this.receivedBufferSize === this.targetBufferSize) {
      const fileBlob = new Blob(this.receivedBuffer)
      this.logger.debug(
        `Received file of size ${fileBlob.size} bytes. Closing transfer channel.`
      )
      FileSaver.save(this.requestedFile.metadata, fileBlob)
      this.requestedFile.blob = fileBlob
      this.emit(this.onDataComplete)
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

  private ensureActive(signal?: Signal<number>): boolean {
    if (this.channel.readyState !== "open") {
      this.logger.debug("Channel not open, stopping transfer")
      toast.error("Transfer cancelled by other device")
      return false
    }
    if (signal?.isAborted) {
      this.logger.debug("Abort signal received, stopping transfer")
      toast.success("Transfer cancelled")
      this.channel.close()
      return false
    }
    return true
  }
}
