import clsx from "clsx"
import { ArrowRight } from "lucide-react"
import { FormEvent, InputHTMLAttributes } from "react"
import { Button } from "./Button"
import cl from "./InputForm.module.css"

type IProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onSubmit"> & {
  formClassName?: string
  canSubmit?: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export const InputForm = ({
  onSubmit,
  formClassName,
  canSubmit = true,
  ...props
}: IProps) => (
  <form
    className={clsx(cl.form, formClassName)}
    onSubmit={(e) => {
      e.preventDefault()
      onSubmit(e)
    }}
  >
    <input type="text" placeholder="Type something" {...props} />
    <Button type="submit" disabled={props.disabled || !canSubmit}>
      <ArrowRight absoluteStrokeWidth />
    </Button>
  </form>
)
