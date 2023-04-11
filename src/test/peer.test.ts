import { describe, expect, jest, test } from "@jest/globals";
import { Socket } from "net";

import { Peer } from "../peer";

describe("Peer", () => {
  test("opens a TCP connection, updates state and sends handshake", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";

    const mockSocket = new Socket();
    const connectSpy = jest
      .spyOn(mockSocket, "connect")
      .mockImplementation(jest.fn<typeof mockSocket.connect>());
    const writeSpy = jest
      .spyOn(mockSocket, "write")
      .mockImplementation(jest.fn<typeof mockSocket.write>());

    const peer = new Peer(ip, port, infoHash, peerId, mockSocket);
    await peer.connect();

    expect(connectSpy).toHaveBeenCalledWith(port, "127.0.0.1");
    expect(writeSpy).toHaveBeenCalledWith(
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123456"
      )
    );
    expect(peer.state).toEqual("CONNECTED");
  });

  test("receives handshake message and updates state", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";

    const mockSocket = new Socket();

    const peer = new Peer(ip, port, infoHash, peerId, mockSocket);

    mockSocket.emit(
      "data",
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123456"
      )
    );

    expect(peer.state).toEqual("HANDSHAKE_COMPLETED");
  });

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
