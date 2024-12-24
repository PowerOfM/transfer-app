import { PeeringChannel } from "./PeeringChannel"
import {
  ITransferCommand,
  ITransferCommandError,
  ITransferCommandReadyToUpload,
  ITransferCommandRequest,
} from "./shared"

export abstract class PeeringFileChannel extends PeeringChannel<ITransferCommand> {
  protected validateCommand(data: unknown): data is ITransferCommand {
    if (!data || typeof data !== "object") return false

    const cmd = data as { type?: string }

    if (cmd.type === "request") {
      return typeof (data as ITransferCommandRequest).fileId === "string"
    }

    if (cmd.type === "ready-to-send") {
      return (
        typeof (data as ITransferCommandReadyToUpload).bufferSize === "number"
      )
    }

    if (cmd.type === "ready-to-receive") {
      return true
    }

    if (cmd.type === "error") {
      return typeof (data as ITransferCommandError).message === "string"
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
