const IP_REGEX =
  /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;
const NOOP = (_value: unknown) => {};

/**
 * Get the user IP throught the webkitRTCPeerConnection
 */
export const getMyIP = async (): Promise<string> => {
  let resolve: (str: string) => void = NOOP;
  const p = new Promise<string>((callback) => {
    resolve = callback;
  });

  // Create connection and random data channel
  const conn = new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun1.l.google.com:19305"] }],
  });
  conn.createDataChannel("test");

  // Set listener when ice canadidates arrive
  conn.onicecandidate = (ice) => {
    if (!ice || !ice.candidate || !ice.candidate.candidate) return;

    const matchResult = ice.candidate.candidate.match(IP_REGEX);
    if (!matchResult) return;
    for (const ip of matchResult) {
      if (ip === "0.0.0.0") continue;
      return resolve(ip);
    }
  };

  // Create offer and set local description
  const offer = await conn.createOffer();
  conn.setLocalDescription(offer);

  return p;
};
