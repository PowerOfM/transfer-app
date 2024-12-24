import clsx from "clsx"
import {
  FileUpIcon,
  ImageUpIcon,
  RefreshCcwIcon,
  UnplugIcon,
} from "lucide-react"
import { FormEvent, Fragment, useState } from "react"
import { Badge } from "../components/Badge"
import { Button } from "../components/Button"
import { InputForm } from "../components/InputForm"
import { IPeerConnection } from "../sharedTypes"
import { DisconnectPrompt } from "./DisconnectPrompt"
import { HistoryFile } from "./HistoryFile"
import { HistoryMessage } from "./HistoryMessage"
import cl from "./PeeringPage.module.css"
import { usePeeringClient } from "./usePeeringClient"

const ACCEPT_IMAGE = "image/*"
const ACCEPT_FILE = "*/*"

interface IProps {
  peerConnection: IPeerConnection
}

export const PeeringPage = ({ peerConnection }: IProps) => {
  const [disconnectPromptOpen, setDisconnectPromptOpen] = useState(false)
  const [message, setMessage] = useState<string>("")
  const {
    history,
    sendMessage,
    offerFile,
    acceptFile,
    error,
    connected,
    disconnect,
  } = usePeeringClient(peerConnection)

  if (error) {
    return (
      <div className="page">
        <div>Error negotiating connection</div>
        <pre>{error.message}</pre>
      </div>
    )
  }

  const handleMessageSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (message.trim()) {
      sendMessage(message)
    }
    setMessage("")
  }

  const handleDisconnect = (shouldDisconnect?: boolean) => {
    setDisconnectPromptOpen(false)
    if (shouldDisconnect) {
      disconnect()
    }
  }

  const handleSendFileClick = (accept: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = accept
    input.addEventListener("change", (e: Event) => {
      const files = (e.target as HTMLInputElement).files
      if (!files?.length) return

      for (const file of files) {
        offerFile(file)
      }
    })
    input.click()
  }

  return (
    <div className={clsx("page", cl.spacePage)}>
      <div className={cl.header}>
        <h1>Encrypted Space</h1>
        {connected && (
          <UnplugIcon
            size={16}
            strokeWidth={1}
            onClick={() => setDisconnectPromptOpen(true)}
          />
        )}
        <Badge color={connected ? "green" : "grey"}>WebRTC</Badge>
      </div>

      <div className={cl.space}>
        {history.map((item, index) =>
          item.type === "status" ? (
            <Fragment key={index}>
              <div className={cl.statusLabel}>{item.message}</div>
              {item.isDisconnected && (
                <Button
                  onClick={() => window.location.reload()}
                  style={{ width: "100%" }}
                >
                  <RefreshCcwIcon size={16} strokeWidth={1} />
                  Connect to Another Device
                </Button>
              )}
            </Fragment>
          ) : item.type === "message" ? (
            <HistoryMessage item={item} key={index} />
          ) : item.type === "file" ? (
            <HistoryFile
              item={item}
              key={index}
              onDownload={() => acceptFile(item.file.id)}
            />
          ) : null
        )}
      </div>

      <div className={cl.buttons}>
        <Button
          leftIcon
          disabled={!connected}
          onClick={() => handleSendFileClick(ACCEPT_FILE)}
        >
          <FileUpIcon size={32} absoluteStrokeWidth />
          Send File
        </Button>
        <Button
          leftIcon
          disabled={!connected}
          onClick={() => handleSendFileClick(ACCEPT_IMAGE)}
        >
          <ImageUpIcon size={32} absoluteStrokeWidth />
          Send Image
        </Button>
      </div>

      <InputForm
        disabled={!connected}
        canSubmit={message.trim() !== ""}
        onSubmit={handleMessageSubmit}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <DisconnectPrompt
        open={disconnectPromptOpen}
        onClose={handleDisconnect}
      />
    </div>
  )
}
