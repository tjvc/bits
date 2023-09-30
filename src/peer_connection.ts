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
    console.debug("Received data:", data);

    while (data.length > 0) {
      if (this.buffer.length > 0) {
        // If there is an incomplete message in the buffer, try to complete it
        const messageLength = this.buffer.readUInt32BE(0);
        const messageLengthWithPrefix = messageLength + 4;
        const remainingLength = messageLengthWithPrefix - this.buffer.length;

        // Append data up to the remaining length to the buffer
        this.buffer = Buffer.concat([
          this.buffer,
          data.slice(0, remainingLength),
        ]);

        data = data.slice(remainingLength);

        // If the message is complete, emit a message event and reset the buffer
        if (this.buffer.length === messageLengthWithPrefix) {
          this.emit("message", this.buffer);
          this.buffer = Buffer.alloc(0);
        }

        continue;
      } else {
        // If there is no data in the buffer, assume we have a new message

        // We assume a handshake will always be a first message
        const length = data.slice(0, 20).equals(HANDSHAKE_HEADER)
          ? 68 // Header (20) + Reserved (8) + Info hash (20) + Peer ID (20)
          : data.readUInt32BE(0) + 4;

        // If the message is incomplete, append it to the buffer and wait for more data
        if (length > data.length) {
          this.buffer = Buffer.concat([this.buffer, data]);
          return;
        }

        // If the message is complete, emit a message event
        this.emit("message", data.slice(0, length));
        data = data.slice(length);
      }
    }
  }

  write(data: Buffer) {
    this.connection.write(data);
  }

  close() {
    this.connection.end();
  }
}
