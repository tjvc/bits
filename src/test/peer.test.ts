import { describe, expect, jest, test } from "@jest/globals";

import { Peer } from "../peer";
import { PeerConnection } from "../peer_connection";

describe("Peer", () => {
  test("opens a TCP connection", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";
    const peerConnection = new PeerConnection(ip, port);
    const connectSpy = jest
      .spyOn(peerConnection, "connect")
      .mockImplementation(jest.fn<typeof peerConnection.connect>());
    const peer = new Peer(ip, port, infoHash, peerId, peerConnection);

    peer.connect();

    expect(connectSpy).toHaveBeenCalled();
  });

  test("connects, updates state and sends handshake", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(ip, port, infoHash, peerId, peerConnection);

    peerConnection.emit("connect");

    expect(peer.state).toEqual("CONNECTED");
    expect(writeSpy).toHaveBeenCalledWith(
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123456"
      )
    );
  });

  test("receives handshake message and updates state", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";
    const peerConnection = new PeerConnection(ip, port);
    const peer = new Peer(ip, port, infoHash, peerId, peerConnection);

    peerConnection.emit(
      "message",
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123456"
      )
    );

    expect(peer.state).toEqual("HANDSHAKE_COMPLETED");
  });

  test("receives a bitfield message, sets the bitfield and sends an interested message", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(ip, port, infoHash, peerId, peerConnection);

    peerConnection.emit("message", Buffer.from("0000092f05ffffffff", "hex"));

    expect(peer.bitfield).toEqual(Buffer.from("ffffffff", "hex"));
    expect(writeSpy).toHaveBeenCalledWith(Buffer.from([0, 0, 0, 1, 2]));
  });

  test("it receives an unchoke message, updates the connection state and sends a request message", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = "456";
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(ip, port, infoHash, peerId, peerConnection);

    peerConnection.emit("message", Buffer.from("0000000101", "hex"));

    expect(peer.state).toEqual("UNCHOKED");
    expect(writeSpy).toHaveBeenCalled(); // TODO: Assert request message
  });

  test.todo("it receives a piece message and ???");

  // TODO: Invalid messages (no length, no type, etc.)
  // TODO: Out of order messages
});
