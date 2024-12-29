import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { Button } from "../components/Button"
import { InputForm } from "../components/InputForm"
import { Modal } from "../components/Modal"
import cl from "./RoomModal.module.css"

enum DiscoveryType {
  Local = "local",
  Direct = "direct",
}

interface IProps {
  open: boolean
  onClose: () => void
  onRoomKey: (key: string) => void
  ipResult?: string
  roomId?: string
}

export function RoomModal({
  open,
  onClose,
  onRoomKey,
  ipResult,
  roomId,
}: IProps) {
  const [discoveryType, setDiscoveryType] = useState<DiscoveryType>(
    DiscoveryType.Local
  )
  const [ourKey, setOurKey] = useState<string>("")
  const [peerKey, setPeerKey] = useState<string>("")

  useEffect(() => {
    setOurKey(roomId ?? "")
    setDiscoveryType(
      roomId === ipResult ? DiscoveryType.Local : DiscoveryType.Direct
    )
  }, [open])

  const setDirectConnection = () => {
    setDiscoveryType(DiscoveryType.Direct)
    const key = crypto.randomUUID().slice(0, 8).toUpperCase()
    setOurKey(key)
    onRoomKey(key)
  }

  const setLocalConnection = () => {
    setDiscoveryType(DiscoveryType.Local)
    onRoomKey(ipResult ?? "")
  }

  const handleKeyChange = (key: string) => {
    setPeerKey(key)
  }

  const ourKeyUrl = `${window.location.origin}/?key=${ourKey}`

  return (
    <Modal open={open} onClose={onClose}>
      <p>Discovery Type</p>
      <div className={cl.discoveryTypeToggle}>
        <Button
          data-active={discoveryType === DiscoveryType.Local}
          onClick={setLocalConnection}
        >
          Local Network
        </Button>
        <Button
          data-active={discoveryType === DiscoveryType.Direct}
          onClick={setDirectConnection}
        >
          Direct Connection
        </Button>
      </div>

      {discoveryType === DiscoveryType.Local && (
        <p>
          This option uses your local network to find devices. If you don't see
          the right device or you are on different networks, switch to Direct
          Connection.
        </p>
      )}

      {discoveryType === DiscoveryType.Direct && (
        <>
          <p>Scan this QR code on the device you want to connect to</p>
          <div className={cl.qrCode}>
            <QRCodeSVG value={ourKeyUrl} level="M" size={256} />
            <p className={cl.ourKey}>{ourKey}</p>
          </div>
          <hr />
          <p>Or enter the key from the other device here:</p>
          <InputForm
            value={peerKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="Enter key"
            onSubmit={() => onRoomKey(peerKey)}
          />
          <Button style={{ marginTop: "20px" }} onClick={onClose}>
            Done
          </Button>
        </>
      )}
    </Modal>
  )
}
