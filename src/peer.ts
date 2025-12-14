import { Handshake } from "./handshake";
import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";
import { EventEmitter } from "events";
import { Bitfield } from "./bitfield";
import { logger } from "./logger";
import { Piece, PieceState } from "./piece";

import fs from "fs/promises";

export type PeerParams = {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  id: Buffer | undefined;
  clientId: Buffer;
  pieces: Piece[];
  state?: PeerState;
  bitfield?: Bitfield;
  currentPiece?: number | null;
  downloadDir?: string;
  chunks?: Buffer[];
};

export enum PeerState {
  Disconnected = "DISCONNECTED",
  Connected = "CONNECTED",
  HandshakeCompleted = "HANDSHAKE_COMPLETED",
  Unchoked = "UNCHOKED",
  Downloading = "DOWNLOADING",
}

export enum FailureReason {
  ConnectionRefused = "CONNECTION_REFUSED",
}

export const PIECE_DOWNLOAD_TIMEOUT_MS = 15000;

export class Peer extends EventEmitter {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  id: Buffer | undefined;
  clientId: Buffer;
  pieces: Piece[];
  state: PeerState;
  bitfield: Bitfield | undefined;
  currentPiece: number | null;
  downloadDir: string;
  chunks: Buffer[];
  connection: PeerConnection;
  chunkLength: number;
  failureReason: FailureReason | null;
  downloadTimeout: NodeJS.Timeout | null;

  constructor({
    ip,
    port,
    infoHash,
    id,
    clientId,
    pieces,
    state = PeerState.Disconnected,
    bitfield,
    currentPiece = null,
    downloadDir = "./",
    chunks = [],
  }: PeerParams) {
    super();

    if (id == undefined) {
      logger.warn(`Peer data for ${ip} does not include peer ID`);
    }

    this.ip = ip;
    this.port = port;
    this.infoHash = infoHash;
    this.id = id;
    this.clientId = clientId;
    this.pieces = pieces;
    this.state = state;
    this.bitfield = bitfield;
    this.currentPiece = currentPiece;
    this.downloadDir = downloadDir;
    this.connection = new PeerConnection(ip, port);
    this.chunks = chunks;
    this.chunkLength = 16384;
    this.failureReason = null;
    this.downloadTimeout = null;

    this.connection.on("message", async (data) => {
      await this.receive(data);
    });

    this.connection.on("connect", () => {
      this.state = PeerState.Connected;
      logger.debug("Connected to", this.ip.toString());
      this.sendHandshake();
    });

    this.connection.on("close", () => {
      this.clearDownloadTimeout();
      this.state = PeerState.Disconnected;
      logger.debug("Connection closed by peer");
      this.emit("disconnect");
    });

    this.connection.on("error", (error) => {
      logger.error("Connection error", error);
      if (error.code === "ECONNREFUSED") {
        this.failureReason = FailureReason.ConnectionRefused;
      }
      this.connection.close();
    });
  }

  connect() {
    this.connection.connect();
  }

  download() {
    this.connect();
  }

  sendHandshake() {
    logger.debug("Sending handshake to", this.ip.toString());
    const handshake = new Handshake(this.infoHash, this.clientId);
    this.connection.write(handshake.data());
  }

  async receive(data: Buffer) {
    this.emit("messageReceived");

    if (this.state == PeerState.Connected) {
      const expectedHandshake = new Handshake(this.infoHash, this.id);

      if (expectedHandshake.matches(data)) {
        logger.debug("Received handshake from", this.ip.toString());
        this.state = PeerState.HandshakeCompleted;
        return;
      }
    }

    const message = new Message(data);

    if (message.type() === MessageType.Bitfield) {
      logger.debug("Received bitfield from", this.ip.toString());
      if (this.state != PeerState.HandshakeCompleted) {
        logger.debug(
          "Received bitfield before handshake from",
          this.ip.toString()
        );
        this.connection.close();
        logger.debug("Connection to", this.ip.toString(), "closed");
        return;
      }

      this.bitfield = new Bitfield(message.body());

      if (this.nextPiece() != null) {
        logger.debug("Sending interested to", this.ip.toString());
        this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
      } else {
        this.connection.close();
        logger.debug("Connection closed");
      }
      return;
    }

    if (message.type() === MessageType.Unchoke) {
      logger.debug("Received unchoke from", this.ip.toString());

      if (
        this.state !== PeerState.Unchoked &&
        this.state !== PeerState.Downloading
      ) {
        this.state = PeerState.Unchoked;

        this.currentPiece = this.nextPiece();
        if (this.currentPiece != null) {
          logger.debug(
            "Requesting piece",
            this.currentPiece,
            "from",
            this.ip.toString()
          );
          this.requestPieceChunk(this.currentPiece);
          this.state = PeerState.Downloading;
          this.pieces[this.currentPiece].state = PieceState.Downloading;
        }
      }
      return;
    }

    if (message.type() === MessageType.Piece) {
      logger.debug(
        "Received chunk",
        this.chunks.length,
        "of piece",
        this.currentPiece as number,
        "from",
        this.ip.toString()
      );

      this.clearDownloadTimeout();

      this.chunks.push(message.body());

      if (this.currentPiece === null) {
        return;
      }

      const piece = this.pieces[this.currentPiece];
      const chunksNeeded = piece.chunksNeeded();
      if (this.chunks.length < chunksNeeded) {
        this.requestPieceChunk(this.currentPiece);
      } else if (this.chunks.length === chunksNeeded) {
        await fs.writeFile(
          `${this.downloadDir}/${this.currentPiece}`,
          Buffer.concat(this.chunks)
        );
        piece.state = PieceState.Downloaded;
        this.emit("pieceDownloaded");
        this.currentPiece = this.nextPiece();
        if (this.currentPiece != null) {
          this.chunks = [];
          this.pieces[this.currentPiece].state = PieceState.Downloading;
          this.requestPieceChunk(this.currentPiece);
        }
      }
      return;
    }

    if (message.type() !== null) {
      logger.warn(
        `Received unhandled ${message
          .typeName()
          .toLowerCase()} message from ${this.ip.toString()}`
      );
    }
  }

  requestPieceChunk(pieceIndex: number) {
    logger.debug(
      `Requesting chunk ${
        this.chunks.length
      } of piece ${pieceIndex} from ${this.ip.toString()}`
    );

    this.startDownloadTimeout();

    const piece = this.pieces[pieceIndex];
    const offset = this.chunks.length * this.chunkLength;
    const remainingBytes = piece.length() - offset;
    const chunkSize = Math.min(this.chunkLength, remainingBytes);

    const request = Buffer.alloc(17); // Allocate 17 byte buffer
    request.writeUInt32BE(13); // Write length prefix (does not include length itself)
    request.writeUInt8(6, 4); // Write message type (value, offset)
    request.writeUInt32BE(pieceIndex, 5); // Write piece index
    request.writeUInt32BE(offset, 9); // Write begin (byte offset)
    request.writeUInt32BE(chunkSize, 13); // Write length (may be less than 16 KB for last chunk)
    this.connection.write(request);
  }

  nextPiece() {
    const index = this.pieces.findIndex(
      (piece, index) =>
        piece.state === PieceState.Required && this.bitfield?.get(index)
    );
    return index > -1 ? index : null;
  }

  startDownloadTimeout() {
    this.clearDownloadTimeout();
    this.downloadTimeout = setTimeout(() => {
      logger.warn(
        `Piece download timed out for ${this.ip.toString()}, disconnecting`
      );
      if (this.currentPiece !== null) {
        this.pieces[this.currentPiece].state = PieceState.Required;
        this.currentPiece = null;
      }
      this.connection.close();
    }, PIECE_DOWNLOAD_TIMEOUT_MS);
  }

  clearDownloadTimeout() {
    if (this.downloadTimeout !== null) {
      clearTimeout(this.downloadTimeout);
      this.downloadTimeout = null;
    }
  }
}
