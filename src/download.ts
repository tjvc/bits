import { BDecoded, BDict, BList } from "./b_data";
import { Peer } from "./peer";

export class Download {
  peers: Peer[] = [];
  private maxDownloaders: number;

  constructor(
    data: BDecoded,
    infoHash: Buffer,
    clientId: Buffer,
    maxDownloaders = 3
  ) {
    this.maxDownloaders = maxDownloaders;

    if (this.isBDict(data) && this.isBList(data.peers)) {
      data.peers.forEach((peer: BDecoded) => {
        if (this.isPeer(peer)) {
          this.peers.push(
            new Peer(peer.ip, peer.port, infoHash, peer["peer id"], clientId)
          );
        }
      });
    }
  }

  start() {
    let count = 0;

    this.peers.forEach((peer) => {
      if (count < this.maxDownloaders) {
        peer.download();
        count++;
      }
    });
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

  private isPeer(
    data: BDecoded
  ): data is { ip: Buffer; port: number; "peer id": Buffer } {
    return (
      this.isBDict(data) &&
      Buffer.isBuffer(data.ip) &&
      typeof data.port === "number" &&
      Buffer.isBuffer(data["peer id"])
    );
  }
}
