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
      this.receive(data);
    });
  }

  async connect() {
    await this.connection.connect(this.port, this.ip.toString());
    this.state = PeerState.Connected;

    await this.handshake();
  }

  async handshake() {
    await this.connection.write(this.handshakeMessage());
  }

  receive(data: Buffer) {
    if (this.handshakeMessage().equals(data)) {
      this.state = PeerState.HandshakeCompleted;
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
