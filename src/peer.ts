import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";

enum PeerState {
  Disconnected = "DISCONNECTED",
  Connected = "CONNECTED",
  HandshakeCompleted = "HANDSHAKE_COMPLETED",
  Unchoked = "UNCHOKED",
}

export class Peer {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  peerId: string;
  connection: PeerConnection;
  state: PeerState;
  bitfield: Buffer | null = null;

  constructor(
    ip: Buffer,
    port: number,
    infoHash: Buffer,
    peerId: string,
    connection?: PeerConnection,
    state: PeerState = PeerState.Disconnected
  ) {
    this.ip = ip;
    this.port = port;
    this.connection = connection || new PeerConnection(this.ip, this.port);
    this.infoHash = infoHash;
    this.peerId = peerId;
    this.state = state;

    this.connection.on("message", (data) => {
      console.log("Received message");
      this.receive(data);
    });

    this.connection.on("connect", () => {
      this.state = PeerState.Connected;
      console.log("Connected to", this.ip.toString());
      this.handshake();
    });

    this.connection.on("close", () => {
      this.state = PeerState.Disconnected;
      console.log("Closed");
    });
  }

  connect() {
    this.connection.connect();
  }

  handshake() {
    console.log("Sending handshake");
    this.connection.write(this.handshakeMessage());
  }

  receive(data: Buffer) {
    // TODO: Match on any reserved bytes
    if (this.handshakeMessage().equals(data)) {
      console.log("Received handshake");
      this.state = PeerState.HandshakeCompleted;
      return;
    }

    const message = new Message(data);

    if (message.type() === MessageType.Bitfield) {
      console.log("Received bitfield");
      this.bitfield = message.body();
      console.log("Sending interested");
      this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
    }

    if (message.type() === MessageType.Unchoke) {
      console.log("Received unchoke");
      this.state = PeerState.Unchoked;
      console.log("Requesting piece");

      const request = Buffer.alloc(17);
      request.writeUInt32BE(13);
      request.writeUInt8(6, 4);
      request.writeUInt32BE(32, 5);
      request.writeUInt32BE(0, 9);
      request.writeUInt32BE(256, 13);
      this.connection.write(request);
    }
  }

  private handshakeMessage() {
    const handshakeHeader = Buffer.from(
      "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00"
    );

    return Buffer.concat([
      handshakeHeader,
      this.infoHash,
      Buffer.from(this.peerId),
    ]);
  }
}
