import fs from "fs/promises";

import { BDecoded, BDict, BList } from "./b_data";
import { Info } from "./info";
import { logger } from "./logger";
import { Peer, PieceState } from "./peer";

interface DownloadParams {
  data: BDecoded;
  infoHash: Buffer;
  clientId: Buffer;
  info: Info;
  maxUploaders?: number;
  peers?: Peer[];
  pieces?: PieceState[];
  downloadDir?: string;
}

export class Download {
  downloadDir: string;
  peers: Peer[];
  pieces: PieceState[];
  private maxUploaders: number;

  constructor({
    data,
    infoHash,
    clientId,
    info,
    maxUploaders = 3,
    peers = [],
    pieces = Array(info.pieceCount()).fill(0),
    downloadDir = "./",
  }: DownloadParams) {
    this.downloadDir = downloadDir;
    this.maxUploaders = maxUploaders;
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
              pieceLength: info.pieceLength(),
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
        const downloadedCount = this.pieces.filter(
          (p) => p === PieceState.Downloaded
        ).length;
        logger.debug(
          `Downloaded ${downloadedCount} of ${this.pieces.length} pieces`
        );

        if (this.pieces.every((piece) => piece === PieceState.Downloaded)) {
          await this.finish();
        }
      });

      peer.on("messageReceived", () => {
        this.logPeerStatus();
      });
    });
  }

  private logPeerStatus() {
    const activePeers = this.peers.filter((p) => p.currentPiece !== null);

    if (activePeers.length === 0) {
      logger.debug("Downloading 0 pieces from 0 peers");
    } else {
      logger.debug(
        `Downloading ${activePeers.length} pieces from ${activePeers.length} peers:`
      );
      activePeers.forEach((p) => {
        logger.debug(`  Piece ${p.currentPiece} from ${p.ip.toString()}`);
      });
    }
  }

  start() {
    let count = 0;

    this.peers.forEach((peer) => {
      if (count < this.maxUploaders) {
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
  ): data is { ip: Buffer; port: number; "peer id"?: Buffer } {
    if (!this.isBDict(data)) {
      return false;
    }

    return (
      this.isBDict(data) &&
      Buffer.isBuffer(data.ip) &&
      typeof data.port === "number" &&
      (data["peer id"] == undefined || Buffer.isBuffer(data["peer id"]))
    );
  }
}
