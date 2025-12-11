import { EventEmitter } from "events";
import { Socket } from "net";

import { Handshake } from "./handshake";

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

    this.connection.on("error", (error) => {
      this.emit("error", error);
    });
  }

  connect() {
    this.connection.connect(this.port, this.ip.toString());
  }

  receive(data: Buffer) {
    // Append all new data to buffer first
    this.buffer = Buffer.concat([this.buffer, data]);

    // Try to extract complete messages from buffer
    while (this.buffer.length > 0) {
      // Check if this is a handshake (starts with header)
      if (this.buffer.slice(0, 20).equals(Handshake.header)) {
        const handshakeLength = 68;
        if (this.buffer.length < handshakeLength) {
          // Incomplete handshake, wait for more data
          return;
        }
        // Complete handshake
        this.emit("message", this.buffer.slice(0, handshakeLength));
        this.buffer = this.buffer.slice(handshakeLength);
        continue;
      }

      // Regular length-prefixed message
      if (this.buffer.length < 4) {
        // Not enough data for length prefix
        return;
      }

      const messageLength = this.buffer.readUInt32BE(0) + 4;
      if (this.buffer.length < messageLength) {
        // Incomplete message, wait for more data
        return;
      }

      // Complete message
      this.emit("message", this.buffer.slice(0, messageLength));
      this.buffer = this.buffer.slice(messageLength);
    }
  }

  write(data: Buffer) {
    this.connection.write(data);
  }

  close() {
    this.connection.end();
  }
}
