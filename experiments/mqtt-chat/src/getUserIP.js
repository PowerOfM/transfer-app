const IP_REGEX =
  /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;
const NOOP = () => {};

/**
 * Get the user IP throught the webkitRTCPeerConnection
 */
export const getUserIP = async () => {
  let defer;
  const p = new Promise((resolve, reject) => {
    defer = { resolve, reject };
  });

  const conn = new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun1.l.google.com:19305"] }],
  });
  conn.createDataChannel("test");
  conn.onicecandidate = (ice) => {
    if (!ice || !ice.candidate || !ice.candidate.candidate) return;

    const matchResult = ice.candidate.candidate.match(IP_REGEX);
    if (!matchResult) return;
    for (const ip of matchResult) {
      if (ip === "0.0.0.0") continue;
      return defer.resolve(ip);
    }
  };

  // create offer and set local description
  const offer = await conn.createOffer();

  conn.setLocalDescription(offer, NOOP, NOOP);
  return p;
};
