import { useEffect, useRef, useState } from "react"
import { IPeerConnection } from "../sharedTypes"
import { PeeringClient, PeeringState } from "./PeeringClient"
import {
  IFileOffered,
  IFileReceived,
} from "./channels/AbstractPeeringFileChannel"

export interface IHistoryStatusItem {
  type: "status"
  message: string
  isDisconnected?: boolean
}

export interface IHistoryMessageItem {
  type: "message"
  message: string
  self: boolean
}

export interface IHistoryFileItem {
  type: "file"
  file: IFileReceived | IFileOffered
  self: boolean
}

export type IHistory =
  | IHistoryStatusItem
  | IHistoryMessageItem
  | IHistoryFileItem

export const usePeeringClient = (peerConnection: IPeerConnection) => {
  const clientRef = useRef<PeeringClient>()
  const [error, setError] = useState<Error | null>(null)
  const [history, setHistory] = useState<IHistory[]>([])
  const [connected, setConnected] = useState<boolean>(false)

  const addHistoryStatus = (message: string, isDisconnected?: boolean) => {
    setHistory((prev) => {
      const next = [...prev]
      if (
        next.find((item) => item.type === "status" && item.message === message)
      ) {
        return next
      }
      return [...next, { type: "status", message, isDisconnected }]
    })
  }

  useEffect(() => {
    const client = new PeeringClient(peerConnection.connection)
    clientRef.current = client

    const listeners = [
      client.onError(setError),
      client.onMessage((message) => {
        setHistory((prev) => [
          ...prev,
          { type: "message", message, self: false },
        ])
      }),
      client.onFileReceived((file) => {
        setHistory((prev) => [...prev, { type: "file", file, self: false }])
      }),
      client.onFileDownloadStarted((file) => {
        setHistory((prev) => {
          const next = [...prev]
          const targetIndex = next.findIndex(
            (item) => item.type === "file" && item.file.id === file.id
          )
          if (targetIndex !== -1) {
            next[targetIndex] = {
              ...(prev[targetIndex] as IHistoryFileItem),
              file,
            }
          } else {
            next.push({ type: "file", file, self: false })
          }
          return next
        })
      }),
      client.onFileDownloadComplete((file, blob) => {
        setHistory((prev) => {
          const next = [...prev]
          const targetIndex = next.findIndex(
            (item) => item.type === "file" && item.file.id === file.id
          )
          if (targetIndex !== -1) {
            next[targetIndex] = {
              ...(prev[targetIndex] as IHistoryFileItem),
              file: { ...file, blob },
            }
          }
          return next
        })
      }),
      client.onStateChange((state) => {
        if (state === PeeringState.Open) {
          addHistoryStatus("Start of Encrypted Space")
        } else if (state === PeeringState.Disconnected) {
          addHistoryStatus("Encrypted Space Ended", true)
        }

        setConnected(state === PeeringState.Open)
      }),
    ]

    if (peerConnection.isInitiator) {
      client.initiate()
    }

    return () => {
      listeners.forEach((listener) => listener.unbind())
      client.destroy()
      clientRef.current = undefined
    }
  }, [peerConnection])

  const sendMessage = (message: string) => {
    if (!clientRef.current) return
    clientRef.current.sendMessage(message)
    setHistory((prev) => [...prev, { type: "message", message, self: true }])
  }

  const offerFile = (file: File) => {
    if (!clientRef.current) return
    const id = clientRef.current.sendFileOffer(file)
    setHistory((prev) => [
      ...prev,
      { type: "file", file: { id, file }, self: true },
    ])
  }

  const acceptFile = (fileId: string) => {
    if (!clientRef.current) return
    clientRef.current.sendFileAccept(fileId)
  }

  const disconnect = () => {
    if (!clientRef.current) return
    clientRef.current.destroy()
  }

  return {
    history,
    sendMessage,
    offerFile,
    acceptFile,
    connected,
    error,
    disconnect,
  }
}
