import { Button } from "../components/Button"
import { Modal } from "../components/Modal"
import cl from "./PeeringPage.module.css"

interface IProps {
  open: boolean
  onClose: (disconnect?: boolean) => void
}

export const DisconnectPrompt = ({ open, onClose }: IProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <p>Are you sure you want to end the encrypted space?</p>
      <div className={cl.buttons}>
        <Button onClick={() => onClose()}>Cancel</Button>
        <Button onClick={() => onClose(true)}>Disconnect</Button>
      </div>
    </Modal>
  )
}
