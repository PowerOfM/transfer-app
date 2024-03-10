import clsx from "clsx";
import { ISignalingPeer } from "../clients/SignalingClient";

interface IProps {
  peers: ISignalingPeer[];
  ownId: string;
  onClick(peer: ISignalingPeer): void;
}

export const DeviceList = ({ peers, ownId, onClick }: IProps) => {
  return (
    <>
      <h2 className="font-bold">Devices</h2>
      {peers.map((peer) => {
        const isYou = peer.id === ownId;
        return (
          <button
            disabled={isYou}
            className={clsx("btn btn-block", isYou && "btn-disabled")}
            onClick={() => onClick(peer)}
          >
            {peer.name} {isYou && "(you)"}
          </button>
        );
      })}
    </>
  );
};
