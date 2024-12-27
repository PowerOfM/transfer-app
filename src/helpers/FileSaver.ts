import { IFileMetadata } from "../peering/channels/PeeringCommandChannel"

export class FileSaver {
  public static save(metadata: File | IFileMetadata, blob: Blob) {
    const file = new File([blob], metadata.name, {
      type: metadata.type,
    })
    const url = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    a.click()
  }
}
