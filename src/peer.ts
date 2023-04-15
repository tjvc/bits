import { Socket } from "net";

enum PeerState {
  Disconnected = "DISCONNECTED",
  Connected = "CONNECTED",
  HandshakeCompleted = "HANDSHAKE_COMPLETED",
}

export class Peer {
  ip: Buffer;
  port: number;
  infoHash: Buffer;
  peerId: string;
  connection: Socket;
  state: PeerState;
  bitfield: Buffer | null = null;

  constructor(
    ip: Buffer,
    port: number,
    infoHash: Buffer,
    peerId: string,
    connection: Socket = new Socket(),
    state: PeerState = PeerState.Disconnected
  ) {
    this.connection = connection;
    this.ip = ip;
    this.port = port;
    this.infoHash = infoHash;
    this.peerId = peerId;
    this.state = state;

    this.connection.on("data", (data) => {
      console.log("Received:", data);
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
    this.connection.connect(this.port, this.ip.toString());
  }

  handshake() {
    console.log("Sending handshake");
    this.connection.write(this.handshakeMessage());
  }

  receive(data: Buffer) {
    if (this.handshakeMessage().equals(data)) {
      console.log("Received handshake");
      this.state = PeerState.HandshakeCompleted;
      return;
    }

    if (data[4] === 5) {
      console.log("Received bitfield");
      this.bitfield = data.slice(5);
      console.log("Sending interested");
      this.connection.write(Buffer.from([0, 0, 0, 1, 2]));
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
