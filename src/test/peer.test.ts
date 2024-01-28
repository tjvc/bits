import { describe, expect, jest, test } from "@jest/globals";

import { Handshake } from "../handshake";
import { Peer } from "../peer";
import { PeerConnection } from "../peer_connection";
import { PeerState, PieceState } from "../peer";

describe("Peer", () => {
  test("opens a TCP connection", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const connectSpy = jest
      .spyOn(peerConnection, "connect")
      .mockImplementation(jest.fn<typeof peerConnection.connect>());
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );

    peer.connect();

    expect(connectSpy).toHaveBeenCalled();
  });

  test("emits a disconnect event when the connection is closed", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const disconnectSpy = jest.fn();
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );
    peer.on("disconnect", disconnectSpy);

    peerConnection.emit("close");

    expect(disconnectSpy).toHaveBeenCalled();
  });

  test("connects, updates state and sends handshake", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );

    peerConnection.emit("connect");

    expect(peer.state).toEqual("CONNECTED");
    expect(writeSpy).toHaveBeenCalledWith(
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123789"
      )
    );
  });

  test("receives handshake message and updates state", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.alloc(20, 1);
    const peerId = Buffer.alloc(20, 2);
    const clientId = Buffer.alloc(20, 3);
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection,
      PeerState.Connected
    );

    peerConnection.emit("message", new Handshake(infoHash, peerId).data());

    expect(peer.state).toEqual("HANDSHAKE_COMPLETED");
  });

  test("closes connection if another message is received before successful handshake", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const closeSpy = jest
      .spyOn(peerConnection, "close")
      .mockImplementation(jest.fn<typeof peerConnection.close>());
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );

    // Bitfield message
    peerConnection.emit("message", Buffer.from("0000092f05ffffffff", "hex"));

    expect(closeSpy).toHaveBeenCalled();
    expect(peer.state).toEqual("DISCONNECTED");
  });

  test("receives a bitfield message, sets the bitfield and sends an interested message", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection,
      PeerState.HandshakeCompleted
    );

    peerConnection.emit("message", Buffer.from("0000092f05ffffffff", "hex"));

    expect(peer.bitfield).toEqual(Buffer.from("ffffffff", "hex"));
    expect(writeSpy).toHaveBeenCalledWith(Buffer.from([0, 0, 0, 1, 2]));
  });

  test("it receives an unchoke message and updates its state", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces: PieceState[] = [];
    const peerConnection = new PeerConnection(ip, port);
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );

    peerConnection.emit("message", Buffer.from("0000000101", "hex"));

    expect(peer.state).toEqual("UNCHOKED");
  });

  test("when unchoked, it sends a request message for a required piece, updates its state and marks the piece as downloading", async () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const infoHash = Buffer.from("123");
    const peerId = Buffer.from("456");
    const clientId = Buffer.from("789");
    const pieces = [1, 0];
    const peerConnection = new PeerConnection(ip, port);
    const writeSpy = jest
      .spyOn(peerConnection, "write")
      .mockImplementation(jest.fn<typeof peerConnection.write>());
    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      peerConnection
    );

    peerConnection.emit("message", Buffer.from("0000000101", "hex"));

    expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(1));
    expect(peer.state).toEqual("DOWNLOADING");
    expect(pieces[1]).toEqual(PieceState.Downloading);
  });

  test.todo(
    "it downloads a complete piece, marks it as downloaded and requests the next piece"
  );

  test.todo(
    "when it fails to download a complete piece, it marks it as not downloaded"
  );

  function buildPieceMessage(pieceIndex: number) {
    const message = Buffer.alloc(17); // Allocate 17 byte buffer
    message.writeUInt32BE(13); // Write length prefix (does not include length itself)
    message.writeUInt8(6, 4); // Write message type (value, offset)
    message.writeUInt32BE(pieceIndex, 5); // Write piece index
    message.writeUInt32BE(0, 9); // Write begin (chunk index * chunk length)
    message.writeUInt32BE(16384, 13); // Write length (16 KB)
    return message;
  }

  // TODO: Invalid messages (no length, no type, etc.)
  // TODO: Out of order messages
});
