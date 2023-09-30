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
      this.receive(data);
    });

    this.connection.on("connect", () => {
      this.state = PeerState.Connected;
      console.debug("Connected to", this.ip.toString());
      this.handshake();
    });

    this.connection.on("close", () => {
      this.state = PeerState.Disconnected;
      console.debug("Connection closed");
    });
  }

  connect() {
    this.connection.connect();
  }

  handshake() {
    console.debug("Sending handshake");
    this.connection.write(this.handshakeMessage());
  }

  receive(data: Buffer) {
    // TODO: Match on any reserved bytes
    if (this.handshakeMessage().equals(data)) {
      console.debug("Received handshake");
      this.state = PeerState.HandshakeCompleted;
      return;
    }

    const message = new Message(data);

    if (message.type() === MessageType.Bitfield) {
      console.debug("Received bitfield");
      this.bitfield = message.body();
      console.debug("Sending interested");
      this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
    }

    if (message.type() === MessageType.Unchoke) {
      console.debug("Received unchoke");
      this.state = PeerState.Unchoked;
      console.debug("Requesting piece");

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
