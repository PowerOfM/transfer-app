import { useState } from "react";
import { discoverIp } from "./helpers/discoverIp";
import { useAsync } from "./helpers/useAsync";
import { SignalingPage } from "./pages/Signaling";

const fallbackId = crypto.randomUUID();

enum AppStep {
  Signaling,
  Peering,
}

export const App = () => {
  const [ip, loading, error] = useAsync(() => discoverIp());
  const [step, setStep] = useState<AppStep>(AppStep.Signaling);

  if (loading) return "Loading...";
  if (error) return <div>Error! {error.message}</div>;

  if (step === AppStep.Signaling) {
    return (
      <SignalingPage
        ip={ip ?? fallbackId}
        autoDiscoveryEnabled={!!ip}
        onReady={() => setStep(AppStep.Peering)}
      />
    );
  } else {
    return <div>hi</div>;
  }
};
