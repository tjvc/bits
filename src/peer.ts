import { Handshake } from "./handshake";
import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";
import { EventEmitter } from "events";
import { Bitfield } from "./bitfield";
import { logger } from "./logger";

import fs from "fs/promises";

export type PeerParams = {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  id: Buffer | undefined;
  clientId: Buffer;
  pieces: PieceState[];
  pieceLength: number;
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

export enum PieceState {
  Required = 0,
  Downloading = 1,
  Downloaded = 2,
}

export enum FailureReason {
  ConnectionRefused = "CONNECTION_REFUSED",
}

export class Peer extends EventEmitter {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  id: Buffer | undefined;
  clientId: Buffer;
  pieces: PieceState[];
  pieceLength: number;
  state: PeerState;
  bitfield: Bitfield | undefined;
  currentPiece: number | null;
  downloadDir: string;
  chunks: Buffer[];
  connection: PeerConnection;
  chunkLength: number;
  failureReason: FailureReason | null;

  constructor({
    ip,
    port,
    infoHash,
    id,
    clientId,
    pieces,
    pieceLength,
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
    this.pieceLength = pieceLength;
    this.state = state;
    this.bitfield = bitfield;
    this.currentPiece = currentPiece;
    this.downloadDir = downloadDir;
    this.connection = new PeerConnection(ip, port);
    this.chunks = chunks;
    this.chunkLength = 16384;
    this.failureReason = null;

    this.connection.on("message", async (data) => {
      await this.receive(data);
    });

    this.connection.on("connect", () => {
      this.state = PeerState.Connected;
      logger.debug("Connected to", this.ip.toString());
      this.sendHandshake();
    });

    this.connection.on("close", () => {
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
    }

    if (message.type() === MessageType.Unchoke) {
      logger.debug("Received unchoke from", this.ip.toString());
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
        this.pieces[this.currentPiece] = PieceState.Downloading;
      }
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
      this.chunks.push(message.body());

      const chunksNeeded = Math.ceil(this.pieceLength / this.chunkLength);
      if (this.chunks.length < chunksNeeded && this.currentPiece != null) {
        this.requestPieceChunk(this.currentPiece);
      } else if (
        this.chunks.length === chunksNeeded &&
        this.currentPiece != null
      ) {
        await fs.writeFile(
          `${this.downloadDir}/${this.currentPiece}`,
          Buffer.concat(this.chunks)
        );
        this.pieces[this.currentPiece] = PieceState.Downloaded;
        this.emit("pieceDownloaded");
        this.currentPiece = this.nextPiece();
        if (this.currentPiece != null) {
          this.chunks = [];
          this.pieces[this.currentPiece] = PieceState.Downloading;
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
    const request = Buffer.alloc(17); // Allocate 17 byte buffer
    request.writeUInt32BE(13); // Write length prefix (does not include length itself)
    request.writeUInt8(6, 4); // Write message type (value, offset)
    request.writeUInt32BE(pieceIndex, 5); // Write piece index
    request.writeUInt32BE(this.chunks.length * this.chunkLength, 9); // Write begin (chunk index * chunk length)
    request.writeUInt32BE(this.chunkLength, 13); // Write length (16 KB)
    this.connection.write(request);
  }

  nextPiece() {
    const index = this.pieces.findIndex(
      (piece, index) =>
        piece === PieceState.Required && this.bitfield?.get(index)
    );
    return index > -1 ? index : null;
  }
}
