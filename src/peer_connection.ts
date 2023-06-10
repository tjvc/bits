import { EventEmitter } from "events";
import { Socket } from "net";

export const HANDSHAKE_HEADER = Buffer.from("\x13BitTorrent protocol");

export class PeerConnection extends EventEmitter {
  ip: Buffer;
  port: number;
  connection: Socket;
  buffer: Buffer;

  constructor(
    ip: Buffer,
    port: number,
    connection: Socket = new Socket(),
    buffer: Buffer = Buffer.alloc(0)
  ) {
    super();

    this.ip = ip;
    this.port = port;
    this.connection = connection;
    this.buffer = buffer;

    this.connection.on("connect", () => {
      this.emit("connect");
    });

    this.connection.on("data", (data) => {
      this.receive(data);
    });
  }

  connect() {
    this.connection.connect(this.port, this.ip.toString());
  }

  receive(data: Buffer) {
    console.log("Received:", data);

    if (data.slice(0, 20).equals(HANDSHAKE_HEADER)) {
      this.emit("message", data.slice(0, 68)); // Header (20) + Reserved (8) + Info hash (20) + Peer ID (20)
      return;
    }

    while (data.length > 0) {
      if (this.buffer.length > 0) {
        const expectedLength = this.buffer.readUInt32BE(0);
        const remainingLength = expectedLength + 4 - this.buffer.length;

        this.buffer = Buffer.concat([
          this.buffer,
          data.slice(0, remainingLength),
        ]);

        data = data.slice(remainingLength);

        if (this.buffer.length === expectedLength + 4) {
          this.emit("message", this.buffer);
          this.buffer = Buffer.alloc(0);
        }

        continue;
      }

      const length = data.readUInt32BE(0);

      if (length > data.length - 4) {
        this.buffer = Buffer.concat([this.buffer, data]);
        return;
      }

      this.emit("message", data.slice(0, length + 4));
      data = data.slice(length + 4);
    }
  }

  write(data: Buffer) {
    this.connection.write(data);
  }
}
