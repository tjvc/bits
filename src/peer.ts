import { Handshake } from "./handshake";
import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";
import { EventEmitter } from "events";

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
  bitfield: Buffer | null = null;
  chunks: Buffer[] = [];
  pieces: PieceState[];
  currentPiece: number | null = null;

  constructor(
    ip: Buffer,
    port: number,
    infoHash: Buffer,
    id: Buffer,
    clientId: Buffer,
    pieces: PieceState[],
    connection: PeerConnection = new PeerConnection(ip, port),
    state: PeerState = PeerState.Disconnected
  ) {
    super();

    this.ip = ip;
    this.port = port;
    this.connection = connection;
    this.infoHash = infoHash;
    this.id = id;
    this.clientId = clientId;
    this.state = state;
    this.pieces = pieces;

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
      this.bitfield = message.body();
      console.debug("Sending interested");
      this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
    }

    if (message.type() === MessageType.Unchoke) {
      console.debug("Received unchoke");
      this.state = PeerState.Unchoked;

      this.currentPiece = this.pieces.findIndex(
        (piece) => piece === PieceState.Required
      );
      if (this.currentPiece > -1) {
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
}
