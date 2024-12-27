import { AbstractPeeringChannel } from "./AbstractPeeringChannel"
import { IFileReceived } from "./AbstractPeeringFileChannel"

export interface IMessage {
  type: "message"
  message: string
}

export interface IFileMetadata {
  type: string
  name: string
  size: number
}

export interface IFileOffer {
  type: "file"
  file: {
    id: string
    metadata: IFileMetadata
  }
}

export type ICommand = IMessage | IFileOffer

export class PeeringCommandChannel extends AbstractPeeringChannel<ICommand> {
  public onMessage = this.registerEvent<[string]>()
  public onFileReceived = this.registerEvent<[IFileReceived]>()

  protected validateCommand(data: unknown): data is ICommand {
    if (!data || typeof data !== "object") return false

    const cmd = data as { type?: string }
    if (cmd.type === "message") {
      return typeof (data as IMessage).message === "string"
    }

    if (cmd.type === "file") {
      const file = (data as IFileOffer).file
      return (
        typeof file === "object" &&
        typeof file.id === "string" &&
        typeof file.metadata === "object" &&
        typeof file.metadata.type === "string" &&
        typeof file.metadata.name === "string" &&
        typeof file.metadata.size === "number"
      )
    }

    return false
  }

  protected processCommand(command: ICommand) {
    switch (command.type) {
      case "message":
        this.emit(this.onMessage, command.message)
        break
      case "file":
        this.emit(this.onFileReceived, command.file)
        break
    }
  }
}
