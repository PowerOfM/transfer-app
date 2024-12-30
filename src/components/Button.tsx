import clsx from "clsx"
import { ButtonHTMLAttributes } from "react"
import cl from "./Button.module.css"

type IProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: boolean
  small?: boolean
}

export const Button = ({
  className,
  children,
  leftIcon = false,
  small = false,
  ...props
}: IProps) => (
  <button
    className={clsx(
      cl.btn,
      className,
      leftIcon && cl.leftIcon,
      small && cl.small
    )}
    {...props}
  >
    {children}
  </button>
)
