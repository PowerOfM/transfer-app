import { Modal } from "../components/Modal"

interface IProps {
  open: boolean
  onClose: () => void
}

export function MQTTModal({ open, onClose }: IProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <p>MQTTModal</p>
    </Modal>
  )
}
