import clsx from "clsx"
import { CopyIcon } from "lucide-react"
import toast from "react-hot-toast"
import { IconButton } from "../components/IconButton"
import cl from "./PeeringPage.module.css"
import { IHistoryMessageItem } from "./usePeeringClient"

interface IProps {
  item: IHistoryMessageItem
}

export const HistoryMessage = ({ item }: IProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(item.message)
    toast.success("Copied to clipboard")
  }

  return (
    <div className={clsx(cl.message, item.self && cl.self)}>
      {item.message}
      <IconButton Icon={CopyIcon} onClick={handleCopy} />
    </div>
  )
}
