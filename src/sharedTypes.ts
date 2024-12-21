export interface IPeerConnection {
  connection: RTCPeerConnection;
  channels: RTCDataChannel[];
}
