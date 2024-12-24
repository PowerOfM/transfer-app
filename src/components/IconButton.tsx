import { LucideIcon } from "lucide-react"
import cl from "./IconButton.module.css"

type IconButtonProps = {
  Icon: LucideIcon
} & React.HTMLAttributes<HTMLDivElement>

export const IconButton = ({ Icon, ...props }: IconButtonProps) => (
  <div className={cl.iconButton} {...props}>
    <Icon size={24} absoluteStrokeWidth />
  </div>
)
