import fs from "fs/promises";

import { BDecoded, BDict, BList } from "./b_data";
import { Peer, PieceState } from "./peer";

export class Download {
  downloadDir: string;
  peers: Peer[];
  pieces: PieceState[];
  private maxDownloaders: number;

  constructor(
    data: BDecoded,
    infoHash: Buffer,
    clientId: Buffer,
    pieceCount: number,
    maxDownloaders = 3,
    peers: Peer[] = [],
    pieces: PieceState[] = Array(pieceCount).fill(0),
    downloadDir = "./"
  ) {
    this.downloadDir = downloadDir;
    this.maxDownloaders = maxDownloaders;
    this.peers = peers;
    this.pieces = pieces;

    if (this.isBDict(data) && this.isBList(data.peers)) {
      data.peers.forEach((peer: BDecoded) => {
        if (this.isPeer(peer)) {
          this.peers.push(
            new Peer({
              ip: peer.ip,
              port: peer.port,
              infoHash,
              id: peer["peer id"],
              clientId,
              pieces: this.pieces,
            })
          );
        }
      });
    }

    this.peers.forEach((peer) => {
      peer.on("disconnect", () => {
        this.peers.splice(this.peers.indexOf(peer), 1);
        this.peers.push(peer);
      });

      peer.on("pieceDownloaded", async () => {
        if (this.pieces.every((piece) => piece === PieceState.Downloaded)) {
          await this.finish();
        }
      });
    });
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

  async finish() {
    const fileHandle = await fs.open(`${this.downloadDir}/download`, "w");
    const stream = fileHandle.createWriteStream();

    for (let i = 0; i < this.pieces.length; i++) {
      stream.write(await fs.readFile(`${this.downloadDir}/${i}`));
    }

    stream.end();
    await fileHandle.close();
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
