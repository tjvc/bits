import fs from "fs/promises";
import path from "path";

import { BDecoded, BDict, BList } from "./b_data";
import { Info } from "./info";
import { logger } from "./logger";
import { Peer } from "./peer";
import { Piece, PieceState } from "./piece";

interface DownloadParams {
  data: BDecoded;
  infoHash: Buffer;
  clientId: Buffer;
  info: Info;
  maxUploaders?: number;
  peers?: Peer[];
  pieces?: Piece[];
  downloadDir?: string;
}

export class Download {
  downloadDir: string;
  peers: Peer[];
  pieces: Piece[];
  private maxUploaders: number;
  private info: Info;
  private infoHash: Buffer;

  constructor({
    data,
    infoHash,
    clientId,
    info,
    maxUploaders = Number(process.env.MAX_UPLOADERS ?? 3),
    peers = [],
    pieces,
    downloadDir = "./downloads",
  }: DownloadParams) {
    this.downloadDir = downloadDir;
    this.infoHash = infoHash;
    this.maxUploaders = maxUploaders;
    this.peers = peers;
    this.info = info;
    this.pieces = pieces ?? this.initializePieces();

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
              downloadDir: this.torrentDir(),
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
          (p) => p.state === PieceState.Downloaded
        ).length;
        logger.debug(
          `Downloaded ${downloadedCount} of ${this.pieces.length} pieces`
        );

        if (
          this.pieces.every((piece) => piece.state === PieceState.Downloaded)
        ) {
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
    const torrentDir = this.torrentDir();
    const fileHandle = await fs.open(path.join(torrentDir, "download"), "w");
    const stream = fileHandle.createWriteStream();

    for (let i = 0; i < this.pieces.length; i++) {
      stream.write(await fs.readFile(path.join(torrentDir, String(i))));
    }

    stream.end();
    await fileHandle.close();
  }

  torrentDir(): string {
    return path.join(this.downloadDir, this.infoHash.toString("hex"));
  }

  private initializePieces(): Piece[] {
    const chunkLength = 16384;
    return Array.from(
      { length: this.info.pieceCount() },
      (_, i) => new Piece(i, this.info, chunkLength)
    );
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
