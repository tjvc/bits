import { describe, expect, jest, test } from "@jest/globals";
import { Socket } from "net";

import { PeerConnection } from "../peer_connection";

describe("PeerConnection", () => {
  test("opens a TCP connection", () => {
    const peer = {
      ip: Buffer.from("127.0.0.1"),
      port: 54321,
    };
    const mockSocket = new Socket();
    const spy = jest.spyOn(mockSocket, "connect");
    const peerConnection = new PeerConnection(peer, mockSocket);

    peerConnection.connect();

    expect(spy).toHaveBeenCalledWith(
      peer.port,
      peer.ip.toString(),
      expect.any(Function) // callback
    );
  });

  test.todo("sends a handshake message");
  test.todo("receives a handshake message and updates connection state");
  test.todo(
    "receives a bitfield message, sets the bitfield and sends an interested message"
  );
  test.todo(
    "it receives an unchoke message, updates the connection state and sends a request message"
  );
  test.todo("it receives a piece message and ???");
  test.todo("sends keep-alive messages");

  // TODO: Incomplete messages
  // TODO: Out of order messages
});
