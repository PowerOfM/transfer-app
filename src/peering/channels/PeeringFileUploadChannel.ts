import { Signal } from "../../helpers/Signal"
import { PeeringFileChannel } from "./PeeringFileChannel"
import {
  IFileOffered,
  ITransferCommand,
  ITransferCommandRequest,
} from "./shared"

const CHUNK_SIZE = 16384

export class PeeringFileUploadChannel extends PeeringFileChannel {
  private requestedFile: IFileOffered | null = null

  constructor(
    channel: RTCDataChannel,
    public readonly filesOffered: IFileOffered[]
  ) {
    super(channel)
  }

  protected processCommand(command: ITransferCommand) {
    switch (command.type) {
      case "file-request":
        this.withErrorHandling(this.handleFileRequest(command))
        break

      case "begin-binary":
        this.withErrorHandling(this.handleBeginBinary())
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

  private async handleFileRequest({ fileId }: ITransferCommandRequest) {
    const fileOffer = this.filesOffered.find((file) => file.id === fileId)
    if (!fileOffer) {
      throw new Error("File not found")
    }

    if (fileOffer.progressSignal) {
      fileOffer.progressSignal.destroy()
    }
    fileOffer.progressSignal = new Signal<number>()

    this.requestedFile = fileOffer
    this.send({
      type: "ready-to-upload",
      bufferSize: fileOffer.file.size,
    })
  }

  private async handleBeginBinary() {
    if (!this.requestedFile) {
      throw new Error("No file to send")
    }

    if (!this.requestedFile.progressSignal) {
      this.requestedFile.progressSignal = new Signal<number>()
    }
    const { file, progressSignal } = this.requestedFile

    let offset = 0
    const fileReader = new FileReader()
    fileReader.addEventListener("error", () =>
      this.send({ type: "error", message: "Error reading file" })
    )
    fileReader.addEventListener("abort", () =>
      this.send({ type: "error", message: "File reading aborted" })
    )
    fileReader.addEventListener("load", (e) => {
      if (progressSignal.isAborted) {
        return
      }

      const data = e.target?.result as ArrayBuffer | null
      if (!data) {
        this.send({
          type: "error",
          message: "Error reading file: got empty buffer",
        })
        return
      }

      this.channel.send(data)
      offset += data.byteLength
      progressSignal.emit(offset)

      if (offset < file.size) {
        readSlice(offset)
      }
    })

    const readSlice = (offset: number) => {
      this.logger.debug("Reading slice", offset)
      const slice = file.slice(offset, offset + CHUNK_SIZE)
      fileReader.readAsArrayBuffer(slice)
    }

    readSlice(0)
  }
}
