import clsx from "clsx";
import {
  CopyIcon,
  DownloadIcon,
  FileUpIcon,
  ImageIcon,
  ImageUpIcon,
  LucideIcon,
  UnplugIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { InputForm } from "../components/InputForm";
import { Logger } from "../helpers/Logger";
import { IPeerConnection } from "../sharedTypes";
import cl from "./PeeringPage.module.css";

interface IProps {
  peerConnection: IPeerConnection;
}

const IconButton = ({ Icon }: { Icon: LucideIcon }) => (
  <div className={cl.iconButton}>
    <Icon size={24} absoluteStrokeWidth />
  </div>
);

export const PeeringPage = ({ peerConnection }: IProps) => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!peerConnection) return;

    const logger = new Logger("PeeringPage");
    // TODO: create hook to manage the peer connection
    // TODO: send data on the main messenger channel
    // TODO: handle file transfer on separate data channel
    // peerConnection.connection.addEventListener("connectionstatechange")
    // peerConnection.connection.addEventListener("datachannel")
    // peerConnection.connection.addEventListener("negotiationneeded")
    // peerConnection.connection.addEventListener("signalingstatechange")
    // peerConnection.connection.addEventListener("track")
    peerConnection.channels.forEach((channel) => {
      logger.debug("channel", channel);
      channel.onmessage = (event) => {
        logger.debug("channel message", event.data);
      };
      channel.onerror = (event) => {
        logger.error("channel error", event);
        setError(new Error("Channel error"));
      };
      channel.send(JSON.stringify({ type: "ping" }));
    });
  }, [peerConnection]);

  if (error)
    return (
      <div className="page">
        <div>Error negotiating connection</div>
        <pre>{error.message}</pre>
      </div>
    );

  return (
    <div className={clsx("page", cl.spacePage)}>
      <div className={cl.header}>
        <h1>Encrypted Space</h1>
        <UnplugIcon size={16} strokeWidth={1} />
        <Badge color="green">WebRTC</Badge>
      </div>

      <div className={cl.space}>
        <div className={cl.statusLabel}>START OF ENCRYPTED SPACE</div>

        <div className={cl.message}>
          This is a test of the system
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={clsx(cl.message, cl.remote)}>
          https://lucide.dev/icons/copy
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={cl.file}>
          <div>
            <ImageIcon size={24} absoluteStrokeWidth />
            IMG001232.jpg
          </div>
          <IconButton Icon={DownloadIcon} />
        </div>
        <div className={cl.message}>
          This is a test of the system
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={clsx(cl.message, cl.remote)}>
          https://lucide.dev/icons/copy
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={cl.file}>
          <div>
            <ImageIcon size={24} absoluteStrokeWidth />
            IMG001232.jpg
          </div>
          <IconButton Icon={DownloadIcon} />
        </div>
        <div className={cl.message}>
          This is a test of the system
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={clsx(cl.message, cl.remote)}>
          https://lucide.dev/icons/copy
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={cl.file}>
          <div>
            <ImageIcon size={24} absoluteStrokeWidth />
            IMG001232.jpg
          </div>
          <IconButton Icon={DownloadIcon} />
        </div>
        <div className={cl.message}>
          This is a test of the system
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={clsx(cl.message, cl.remote)}>
          https://lucide.dev/icons/copy
          <IconButton Icon={CopyIcon} />
        </div>

        <div className={clsx(cl.file, cl.remote)}>
          <div>
            <ImageIcon size={24} absoluteStrokeWidth />
            IMG001232.jpg
          </div>
          <IconButton Icon={DownloadIcon} />
        </div>

        <div className={cl.statusLabel}>ENCRYPTED SPACE ENDED</div>
      </div>

      <div className={cl.buttons}>
        <Button leftIcon>
          <FileUpIcon size={32} absoluteStrokeWidth />
          Send File
        </Button>
        <Button leftIcon>
          <ImageUpIcon size={32} absoluteStrokeWidth />
          Send Image
        </Button>
      </div>

      <InputForm onSubmit={console.log} />
    </div>
  );
};
