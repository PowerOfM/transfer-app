import clsx from "clsx"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"
import { useRef } from "react"
import { ColorHelper } from "../helpers/ColorHelper"
import { DeviceType, ISignalingPeer } from "./SignalingClient"
import cl from "./SignalingPage.module.css"

interface IProps {
  peer: ISignalingPeer
  clientId: string
  onClick: (peer: ISignalingPeer) => void
}

export function SignalingPeerItem({ peer, clientId, onClick }: IProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isYou = peer.id === clientId

  const iconColor = ref.current
    ? ColorHelper.getTextColor(
        window.getComputedStyle(ref.current).backgroundColor
      )
    : "white"

  return (
    <div
      key={peer.id}
      className={clsx(cl.peer, isYou && cl.disabled)}
      onClick={() => !isYou && onClick(peer)}
    >
      <div
        ref={ref}
        className={cl.icon}
        style={{ backgroundColor: peer.name.split(" ")[0] }}
      >
        {peer.deviceType === DeviceType.Mobile ? (
          <SmartphoneIcon color={iconColor} />
        ) : (
          <MonitorIcon color={iconColor} />
        )}
      </div>
      {peer.name} {isYou && "(you)"}
    </div>
  )
}
