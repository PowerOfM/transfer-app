import { Signal } from "../../helpers/Signal"
import { AbstractPeeringChannel } from "./AbstractPeeringChannel"
import { IFileMetadata } from "./PeeringCommandChannel"

export interface IFileOffered {
  id: string
  file: File
  progressSignal?: Signal<number>
}

export interface IFileReceived {
  id: string
  metadata: IFileMetadata
  blob?: Blob
  progressSignal?: Signal<number>
}

export interface IFileCommandRequest {
  type: "file-request"
  fileId: string
}

export interface IFileCommandReadyToUpload {
  type: "ready-to-upload"
  bufferSize: number
}

export interface IFileCommandBeginBinary {
  type: "begin-binary"
}

export interface IFileCommandError {
  type: "error"
  message: string
}

export type IFileCommand =
  | IFileCommandRequest
  | IFileCommandReadyToUpload
  | IFileCommandBeginBinary
  | IFileCommandError

export abstract class AbstractPeeringFileChannel extends AbstractPeeringChannel<IFileCommand> {
  protected validateCommand(data: unknown): data is IFileCommand {
    if (!data || typeof data !== "object") return false

    const cmd = data as IFileCommand

    if (cmd.type === "file-request") {
      return typeof (data as IFileCommandRequest).fileId === "string"
    }

    if (cmd.type === "ready-to-upload") {
      return typeof (data as IFileCommandReadyToUpload).bufferSize === "number"
    }

    if (cmd.type === "begin-binary") {
      return true
    }

    if (cmd.type === "error") {
      return typeof (data as IFileCommandError).message === "string"
    }

    return false
  }

  protected withErrorHandling(promise: Promise<void>) {
    promise.catch((error) => {
      this.send({ type: "error", message: error.message })
      return
    })
  }
}
