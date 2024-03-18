import { SignalingClient } from "./clients/SignalingClient";
import { WebRTCClient } from "./clients/WebRTCClient";

class AppOrchestrator {
  public readonly signalingClient = new SignalingClient();
  public webRTCClient: WebRTCClient | undefined;
  public peerId: string | undefined;
}

export const orchestrator = new AppOrchestrator();
