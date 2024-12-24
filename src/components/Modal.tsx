import { MouseEvent } from "react"
import cl from "./Modal.module.css"

interface IProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, onClose, children }: IProps) {
  if (!open) return null

  const handleModalClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={cl.modal} onClick={handleModalClick}>
      <div className={cl.content}>{children}</div>
    </div>
  )
}
