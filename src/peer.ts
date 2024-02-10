import { Handshake } from "./handshake";
import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";
import { EventEmitter } from "events";
import { Bitfield } from "./bitfield";

import fs from "fs";

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

export class Peer extends EventEmitter {
  ip: Buffer;
  port: number;
  id: Buffer;
  infoHash: Buffer;
  connection: PeerConnection;
  state: PeerState;
  clientId: Buffer;
  bitfield: Bitfield | null = null;
  chunks: Buffer[] = [];
  pieces: PieceState[];
  currentPiece: number | null;
  downloadDir: string;

  constructor(
    ip: Buffer,
    port: number,
    infoHash: Buffer,
    id: Buffer,
    clientId: Buffer,
    pieces: PieceState[],
    state: PeerState = PeerState.Disconnected,
    bitfield: Bitfield | null = null,
    currentPiece: number | null = null,
    downloadDir = "./"
  ) {
    super();

    this.ip = ip;
    this.port = port;
    this.connection = new PeerConnection(ip, port);
    this.infoHash = infoHash;
    this.id = id;
    this.clientId = clientId;
    this.state = state;
    this.pieces = pieces;
    this.bitfield = bitfield;
    this.downloadDir = downloadDir;
    this.currentPiece = currentPiece;

    this.connection.on("message", (data) => {
      this.receive(data);
    });

    this.connection.on("connect", () => {
      this.state = PeerState.Connected;
      console.debug("Connected to", this.ip.toString());
      this.sendHandshake();
    });

    this.connection.on("close", () => {
      this.state = PeerState.Disconnected;
      console.debug("Connection closed by peer");
      this.emit("disconnect");
    });
  }

  connect() {
    this.connection.connect();
  }

  download() {
    this.connect();
  }

  sendHandshake() {
    console.debug("Sending handshake");
    const handshake = new Handshake(this.infoHash, this.clientId);
    this.connection.write(handshake.data());
  }

  receive(data: Buffer) {
    if (this.state == PeerState.Connected) {
      const expectedHandshake = new Handshake(this.infoHash, this.id);

      if (expectedHandshake.matches(data)) {
        console.debug("Received handshake");
        this.state = PeerState.HandshakeCompleted;
        return;
      }
    }

    const message = new Message(data);

    if (message.type() === MessageType.Bitfield) {
      console.debug("Received bitfield");
      if (this.state != PeerState.HandshakeCompleted) {
        console.debug("Received bitfield before handshake");
        this.connection.close();
        console.debug("Connection closed");
        return;
      }

      this.bitfield = new Bitfield(message.body());

      if (this.nextPiece() != null) {
        console.debug("Sending interested");
        this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
      } else {
        this.connection.close();
        console.debug("Connection closed");
      }
    }

    if (message.type() === MessageType.Unchoke) {
      console.debug("Received unchoke");
      this.state = PeerState.Unchoked;

      this.currentPiece = this.nextPiece();
      if (this.currentPiece != null) {
        console.debug("Requesting piece", this.currentPiece);
        this.requestPieceChunk(this.currentPiece);
        this.state = PeerState.Downloading;
        this.pieces[this.currentPiece] = PieceState.Downloading;
      }
    }

    if (message.type() === MessageType.Piece) {
      console.debug("Received chunk");
      this.chunks.push(message.body());

      // 262144 / 16384 = 16 (piece length / chunk length)
      if (this.chunks.length < 16 && this.currentPiece != null) {
        this.requestPieceChunk(this.currentPiece);
      } else if (this.chunks.length === 16 && this.currentPiece != null) {
        fs.writeFileSync(
          `${this.downloadDir}/${this.currentPiece}`,
          Buffer.concat(this.chunks)
        );
        this.pieces[this.currentPiece] = PieceState.Downloaded;
        this.currentPiece = this.nextPiece();
        if (this.currentPiece != null) {
          this.chunks = [];
          this.pieces[this.currentPiece] = PieceState.Downloading;
          this.requestPieceChunk(this.currentPiece);
        }
      }
    }
  }

  requestPieceChunk(pieceIndex: number) {
    console.debug("Requesting chunk");
    const request = Buffer.alloc(17); // Allocate 17 byte buffer
    request.writeUInt32BE(13); // Write length prefix (does not include length itself)
    request.writeUInt8(6, 4); // Write message type (value, offset)
    request.writeUInt32BE(pieceIndex, 5); // Write piece index
    request.writeUInt32BE(this.chunks.length * 16384, 9); // Write begin (chunk index * chunk length)
    request.writeUInt32BE(16384, 13); // Write length (16 KB)
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
