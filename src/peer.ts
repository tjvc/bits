import { Handshake } from "./handshake";
import { Message, MessageType } from "./message";
import { PeerConnection } from "./peer_connection";

export enum PeerState {
  Disconnected = "DISCONNECTED",
  Connected = "CONNECTED",
  HandshakeCompleted = "HANDSHAKE_COMPLETED",
  Unchoked = "UNCHOKED",
}

export class Peer {
  ip: Buffer;
  port: number;
  id: Buffer;
  infoHash: Buffer;
  connection: PeerConnection;
  state: PeerState;
  clientId: Buffer;
  bitfield: Buffer | null = null;

  constructor(
    ip: Buffer,
    port: number,
    infoHash: Buffer,
    id: Buffer,
    clientId: Buffer,
    connection: PeerConnection = new PeerConnection(ip, port),
    state: PeerState = PeerState.Disconnected
  ) {
    this.ip = ip;
    this.port = port;
    this.connection = connection;
    this.infoHash = infoHash;
    this.id = id;
    this.clientId = clientId;
    this.state = state;

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
    });
  }

  connect() {
    this.connection.connect();
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
}
