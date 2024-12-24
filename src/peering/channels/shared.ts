import { Signal } from "../../helpers/Signal"
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

export interface ITransferCommandRequest {
  type: "file-request"
  fileId: string
}

export interface ITransferCommandReadyToUpload {
  type: "ready-to-upload"
  bufferSize: number
}

export interface ITransferCommandBeginBinary {
  type: "begin-binary"
}

export interface ITransferCommandError {
  type: "error"
  message: string
}

export type ITransferCommand =
  | ITransferCommandRequest
  | ITransferCommandReadyToUpload
  | ITransferCommandBeginBinary
  | ITransferCommandError
