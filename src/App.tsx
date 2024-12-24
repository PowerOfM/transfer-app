import { useCallback, useState } from "react"
import { PeeringPage } from "./peering/PeeringPage"
import { IPeerConnection } from "./sharedTypes"
import { SignalingPage } from "./signaling/SignalingPage"

type AppStep = "signaling" | "peering"

export const App = () => {
  const [step, setStep] = useState<AppStep>("signaling")
  const [peerConnection, setPeerConnection] = useState<IPeerConnection | null>(
    null
  )

  const onSignalingReady = useCallback((result: IPeerConnection) => {
    setPeerConnection(result)
    setStep("peering")
  }, [])

  if (step === "signaling") {
    return <SignalingPage onReady={onSignalingReady} />
  } else if (peerConnection) {
    return <PeeringPage peerConnection={peerConnection} />
  } else {
    return <div className="page">Error: Unexpected state</div>
  }
}
