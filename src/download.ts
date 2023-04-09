import { BDecoded, BDict, BList } from "./b_data";

type Peer = {
  ip: Buffer;
  port: number;
};

export class Download {
  peers: Peer[] = [];

  constructor(data: BDecoded) {
    if (this.isBDict(data) && this.isBList(data.peers)) {
      data.peers.forEach((peer: BDecoded) => {
        if (this.isPeer(peer)) {
          this.peers.push(peer);
        }
      });
    }
  }

  private isBDict(data: BDecoded): data is BDict {
    return (
      typeof data == "object" && !Array.isArray(data) && !Buffer.isBuffer(data)
    );
  }

  private isBList(data: BDecoded): data is BList {
    return (
      typeof data == "object" && Array.isArray(data) && !Buffer.isBuffer(data)
    );
  }

  private isPeer(data: BDecoded): data is Peer {
    return (
      this.isBDict(data) &&
      Buffer.isBuffer(data.ip) &&
      typeof data.port === "number"
    );
  }
}
