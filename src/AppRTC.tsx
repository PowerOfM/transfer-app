import { useEffect, useRef, useState } from "react";
import { discoverIp } from "./helpers/discoverIp";
import { generateName } from "./helpers/generateName";
import { ISignalingUser, SignalingClient } from "./clients/SignalingClient";
import { useAsync } from "./helpers/useAsync";

interface IProps {
  ip: string;
}

const fallbackId = crypto.randomUUID();
const initialName = generateName();

export const AppWithIP = ({ ip }: IProps) => {
  const refSignalingClient = useRef<SignalingClient | null>(null);
  const [emoji] = useState<string>("🫠");
  const [users, setUsers] = useState<ISignalingUser[]>([]);

  useEffect(() => {
    async function run() {
      const signalingClient = await SignalingClient.build(
        ip,
        initialName,
        emoji
      );
      refSignalingClient.current = signalingClient;
      signalingClient.onUsers(setUsers);
    }

    run().catch(console.error);
    return () => {
      refSignalingClient.current?.destroy();
    };
  }, [ip, emoji]);

  return (
    <>
      <p>
        {initialName} - {emoji}
      </p>
      {ip === fallbackId && <p>Auto-discovery not available</p>}

      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </>
  );
};

export const App = () => {
  const [ip, loading, error] = useAsync(() => discoverIp());

  if (loading) return "Loading...";
  if (error) return <div>Error! {error.message}</div>;

  return <AppWithIP ip={ip ?? fallbackId} />;
};
