import clsx from "clsx"
import { Badge } from "./Badge"
import { ConnectionArrow } from "./ConnectionArrow"
import cl from "./ConnectionPage.module.css"

export const ConnectionPage = ({ message }: { message: string }) => (
  <div className={clsx("page", cl.connection)}>
    <div className={cl.visual}>
      <Badge color="pink">MQTT</Badge>
      <ConnectionArrow />
      <Badge color="green">WebRTC</Badge>
    </div>

    <div className={cl.info}>{message}</div>
  </div>
)
