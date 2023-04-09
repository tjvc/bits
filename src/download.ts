import { BDecoded } from "./b_data";

type Peer = {
  ip: string;
  port: number;
};

export class Download {
  peers: Peer[] = [];

  constructor(data: BDecoded) {
    if (typeof data === "object" && "peers" in data) {
      if (Array.isArray(data.peers)) {
        data.peers.forEach((peer: unknown) => {
          if (
            typeof peer === "object" &&
            peer !== null &&
            "ip" in peer &&
            "port" in peer
          ) {
            if (Buffer.isBuffer(peer.ip) && typeof peer.port === "number") {
              this.peers.push({ ip: peer.ip.toString(), port: peer.port });
            }
          }
        });
      }
    }
  }
}
