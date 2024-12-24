import clsx from "clsx"
import { DownloadIcon, ImageIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { IconButton } from "../components/IconButton"
import cl from "./HistoryItems.module.css"
import { IHistoryFileItem } from "./usePeeringClient"

interface IProps {
  item: IHistoryFileItem
  onDownload: (fileId: string) => void
}

export const HistoryFile = ({ item, onDownload }: IProps) => {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const signal = item.file.progressSignal
    if (!signal) return

    const update = (progress: number) => setProgress(progress)
    signal.subscribe(update)

    return () => {
      signal.unsubscribe(update)
    }
  }, [item.file.progressSignal])

  return (
    <div className={clsx(cl.historyItem, cl.file, item.self && cl.self)}>
      <div className={cl.progress} style={{ width: `${progress}%` }} />
      <div>
        <ImageIcon size={24} absoluteStrokeWidth />
        {"metadata" in item.file
          ? item.file.metadata.name + ` (${item.file.metadata.size} bytes)`
          : item.file.file.name + ` (${item.file.file.size} bytes)`}
      </div>
      <IconButton
        Icon={DownloadIcon}
        onClick={() => onDownload(item.file.id)}
      />
    </div>
  )
}
