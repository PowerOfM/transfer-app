import clsx from "clsx"
import cl from "./Badge.module.css"

type BadgeColor = "grey" | "pink" | "green"

type IProps = {
  className?: string
  color: BadgeColor
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export const Badge = ({ className, color, children, ...props }: IProps) => {
  return (
    <div className={clsx(cl.badge, className, cl[color])} {...props}>
      {children}
    </div>
  )
}
