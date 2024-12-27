import clsx from "clsx"
import { DownloadIcon, ImageIcon, XIcon } from "lucide-react"
import { IconButton } from "../components/IconButton"
import { FileSaver } from "../helpers/FileSaver"
import { useSignal } from "../helpers/Signal"
import cl from "./HistoryItems.module.css"
import { IHistoryFileItem } from "./usePeeringClient"

interface IProps {
  item: IHistoryFileItem
  onDownload: (fileId: string) => void
}

const KB = 1024
const MB = KB * KB
const GB = MB * KB

function formatFileSize(size: number) {
  if (size < KB) return `${size} bytes`
  if (size < MB) return `${Math.round(size / KB)} KB`
  if (size < GB) return `${Math.round(size / MB)} MB`
  return `${Math.round(size / GB)} GB`
}

export const HistoryFile = ({ item, onDownload }: IProps) => {
  const progress = useSignal(item.file.progressSignal)

  const metadata = "metadata" in item.file ? item.file.metadata : item.file.file
  const isDownloading =
    item.file.progressSignal &&
    !item.file.progressSignal.isAborted &&
    progress !== null &&
    progress < 100

  const handleDownloadClick = () => {
    if ("blob" in item.file && item.file.blob) {
      FileSaver.save(item.file.metadata, item.file.blob)
    } else {
      onDownload(item.file.id)
    }
  }
  const handleCancelClick = () => {
    item.file.progressSignal?.abort()
  }

  return (
    <div className={clsx(cl.historyItem, cl.file, item.self && cl.self)}>
      <div className={cl.progress} style={{ width: `${progress || 0}%` }} />
      <div>
        <ImageIcon size={24} absoluteStrokeWidth />

        <span>{metadata.name + ` (${formatFileSize(metadata.size)})`}</span>

        {isDownloading ? (
          <IconButton Icon={XIcon} onClick={handleCancelClick} />
        ) : !item.self ? (
          <IconButton Icon={DownloadIcon} onClick={handleDownloadClick} />
        ) : (
          <div className={cl.spacer} />
        )}
      </div>
    </div>
  )
}
