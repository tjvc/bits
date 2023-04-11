import { Socket } from "net";

export class Peer {
  ip: Buffer;
  port: number;
  connection: Socket;

  constructor(ip: Buffer, port: number, connection: Socket = new Socket()) {
    this.ip = ip;
    this.port = port;
    this.connection = connection;
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.connection.connect(this.port, this.ip.toString(), () => {
        resolve();
      });
    });
  }
}
