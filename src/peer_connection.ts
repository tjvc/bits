import { Socket } from "net";
import { Peer } from "./download";

export class PeerConnection {
  connection: Socket;
  peer: Peer;

  constructor(peer: Peer, connection: Socket = new Socket()) {
    this.connection = connection;
    this.peer = peer;
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.connection.connect(this.peer.port, this.peer.ip.toString(), () => {
        resolve();
      });
    });
  }
}
