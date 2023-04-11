import { describe, expect, jest, test } from "@jest/globals";
import { Socket } from "net";

import { Peer } from "../peer";

describe("Peer", () => {
  test("opens a TCP connection", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const mockSocket = new Socket();
    const spy = jest.spyOn(mockSocket, "connect");
    const peer = new Peer(ip, port, mockSocket);

    peer.connect();

    expect(spy).toHaveBeenCalledWith(
      port,
      "127.0.0.1",
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
