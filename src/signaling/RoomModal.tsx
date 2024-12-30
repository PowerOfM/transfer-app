import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useState } from "react"
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
  emoji: string
  clientId?: string
  ipResult?: string
  roomId?: string
}

export function RoomModal({
  open,
  onClose,
  onRoomKey,
  emoji,
  clientId,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setPeerKey(key.toUpperCase().trim())
  }

  const ourKeyUrl = useMemo(() => {
    const url = new URL(window.location.href)
    url.searchParams.set("k", ourKey)
    if (clientId) url.searchParams.set("p", clientId)
    if (emoji) url.searchParams.set("e", emoji)
    return url.toString()
  }, [ourKey, clientId, emoji])

  return (
    <Modal open={open} onClose={onClose}>
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
        <>
          <p>
            This option uses your local network to find devices. If you don't
            see the right device or you are on different networks, switch to
            Direct Connection.
          </p>

          <p>
            As always, make sure your emoji symbol is the same on both devices.
          </p>
        </>
      )}

      {discoveryType === DiscoveryType.Direct && (
        <>
          <p>Scan the QR code or enter the key on the other device</p>
          <div className={cl.qrCode}>
            <QRCodeSVG value={ourKeyUrl} level="M" size={256} />
            <p className={cl.ourKey}>{ourKey}</p>
          </div>

          <div className={cl.orSeparator}>
            <span>OR</span>
          </div>

          <p>Type the key from the other device</p>
          <InputForm
            value={peerKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder="Other device key"
            onSubmit={() => {
              onRoomKey(peerKey)
              onClose()
            }}
          />
          <Button style={{ marginTop: "20px" }} onClick={onClose}>
            Done
          </Button>
        </>
      )}
    </Modal>
  )
}
