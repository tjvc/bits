import { describe, expect, jest, test } from "@jest/globals";

import crypto from "crypto";
import fs from "fs";

import { Handshake } from "../handshake";
import { Peer } from "../peer";
import { PeerState, PieceState } from "../peer";
import { Bitfield } from "../bitfield";

describe("Peer", () => {
  test("initialises a connection with the peer's IP and port", async () => {
    const peer = buildPeer();

    const connection = peer.connection;

    expect(connection.ip).toEqual(peer.ip);
    expect(connection.port).toEqual(peer.port);
  });

  test("opens a TCP connection", async () => {
    const peer = buildPeer();
    const connection = peer.connection;
    const connectSpy = jest
      .spyOn(connection, "connect")
      .mockImplementation(jest.fn<typeof connection.connect>());

    peer.connect();

    expect(connectSpy).toHaveBeenCalled();
  });

  test("emits a disconnect event and updates the state when the connection is closed", async () => {
    const disconnectSpy = jest.fn();
    const peer = buildPeer({ state: PeerState.Connected });
    peer.on("disconnect", disconnectSpy);

    peer.connection.emit("close");

    expect(disconnectSpy).toHaveBeenCalled();
    expect(peer.state).toEqual("DISCONNECTED");
  });

  test("connects, updates state and sends handshake", async () => {
    const peer = buildPeer({
      infoHash: Buffer.from("123"),
      clientId: Buffer.from("789"),
    });
    const connection = peer.connection;
    const writeSpy = jest
      .spyOn(connection, "write")
      .mockImplementation(jest.fn<typeof connection.write>());

    connection.emit("connect");

    expect(peer.state).toEqual("CONNECTED");
    expect(writeSpy).toHaveBeenCalledWith(
      Buffer.from(
        "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00123789"
      )
    );
  });

  test("receives handshake message and updates state", () => {
    const peer = buildPeer({ state: PeerState.Connected });

    peer.connection.emit(
      "message",
      new Handshake(peer.infoHash, peer.id).data()
    );

    expect(peer.state).toEqual("HANDSHAKE_COMPLETED");
  });

  test("closes connection if another message is received before successful handshake", () => {
    const peer = buildPeer();
    const connection = peer.connection;
    const closeSpy = jest
      .spyOn(connection, "close")
      .mockImplementation(jest.fn<typeof connection.close>());

    // 4-byte length prefix, 1-byte message type, bitfield
    connection.emit("message", Buffer.from("0000000505ffffffff", "hex"));

    expect(closeSpy).toHaveBeenCalled();
  });

  test("receives a bitfield message, sets the bitfield and sends an interested message if the peer has required pieces", async () => {
    const peer = buildPeer({
      pieces: [0],
      state: PeerState.HandshakeCompleted,
    });
    const connection = peer.connection;
    const writeSpy = jest
      .spyOn(connection, "write")
      .mockImplementation(jest.fn<typeof connection.write>());

    // 4-byte length prefix, 1-byte message type, bitfield
    connection.emit("message", Buffer.from("0000000505ffffffff", "hex"));

    expect(peer.bitfield).toEqual(new Bitfield(Buffer.from("ffffffff", "hex")));
    expect(writeSpy).toHaveBeenCalledWith(Buffer.from([0, 0, 0, 1, 2]));
  });

  test("receives a bitfield message, sets the bitfield and closes the connection if the peer does not have required pieces", async () => {
    const peer = buildPeer({
      pieces: [0],
      state: PeerState.HandshakeCompleted,
    });
    const connection = peer.connection;
    const closeSpy = jest
      .spyOn(connection, "close")
      .mockImplementation(jest.fn<typeof connection.close>());

    // 4-byte length prefix, 1-byte message type, bitfield
    connection.emit("message", Buffer.from("000000050500", "hex"));

    expect(peer.bitfield).toEqual(new Bitfield(Buffer.from([0])));
    expect(closeSpy).toHaveBeenCalled();
  });

  test("it receives an unchoke message and updates its state", async () => {
    const peer = buildPeer();
    const connection = peer.connection;

    connection.emit("message", Buffer.from("0000000101", "hex"));

    expect(peer.state).toEqual("UNCHOKED");
  });

  test("when unchoked, it sends a request message for a required piece offered by the peer, updates its state and marks the piece as downloading", async () => {
    const pieces = [1, 0, 0];
    const bitfield = new Bitfield(Buffer.from([32])); // 00100000
    const peer = buildPeer({ pieces, bitfield });
    const connection = peer.connection;
    const writeSpy = jest
      .spyOn(connection, "write")
      .mockImplementation(jest.fn<typeof connection.write>());

    connection.emit("message", Buffer.from("0000000101", "hex"));

    expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(2));
    expect(peer.state).toEqual("DOWNLOADING");
    expect(pieces[2]).toEqual(PieceState.Downloading);
  });

  test("it downloads a complete piece, marks it as downloaded and requests the next piece", async () => {
    const pieces = [1, 0];
    const bitfield = new Bitfield(Buffer.from([255])); // 11111111
    const downloadDir = makeDownloadDir();
    const currentPiece = 0;
    const peer = buildPeer({ pieces, bitfield, downloadDir, currentPiece });
    const connection = peer.connection;
    const writeSpy = jest
      .spyOn(connection, "write")
      .mockImplementation(jest.fn<typeof connection.write>());

    const pieceChunks: Buffer[] = [];
    for (let i = 0; i < 16; i++) {
      pieceChunks.push(Buffer.alloc(16384, i.toString()));
    }

    pieceChunks.forEach((piece) => {
      connection.emit(
        "message",
        Buffer.concat([
          Buffer.from("0000400007", "hex"), // 4000 = 16 KB length
          piece,
        ])
      );
    });

    for (let i = 1; i < 16; i++) {
      expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(0, i));
    }
    expect(pieces[0]).toEqual(PieceState.Downloaded);

    expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(1, 0));
    expect(pieces[1]).toEqual(PieceState.Downloading);

    const downloadedPiece = fs.readFileSync(`${downloadDir}/0`);
    expect(downloadedPiece).toEqual(Buffer.concat(pieceChunks));

    fs.rmdirSync(downloadDir, { recursive: true });
  });

  test.todo(
    "when it fails to download a complete piece, it marks it as not downloaded"
  );

  test.todo(
    "when it finishes downloading a piece and there are no more required pieces, it closes the connection"
  );

  function makeDownloadDir() {
    const downloadDir = `/tmp/${crypto.randomBytes(20).toString("hex")}`;
    fs.mkdirSync(downloadDir);
    return downloadDir;
  }

  function buildPeer({
    infoHash = Buffer.alloc(20, 1),
    peerId = Buffer.alloc(20, 2),
    clientId = Buffer.alloc(20, 3),
    state = PeerState.Disconnected,
    pieces = [],
    bitfield = new Bitfield(Buffer.alloc(0)),
    currentPiece = null,
    downloadDir = makeDownloadDir(),
  }: {
    infoHash?: Buffer;
    peerId?: Buffer;
    clientId?: Buffer;
    state?: PeerState;
    pieces?: PieceState[];
    bitfield?: Bitfield;
    downloadDir?: string;
    currentPiece?: number | null;
  } = {}): Peer {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;

    const peer = new Peer(
      ip,
      port,
      infoHash,
      peerId,
      clientId,
      pieces,
      state,
      bitfield,
      currentPiece,
      downloadDir
    );

    return peer;
  }

  function buildPieceMessage(pieceIndex: number, chunkIndex = 0) {
    const message = Buffer.alloc(17); // Allocate 17 byte buffer
    message.writeUInt32BE(13); // Write length prefix (does not include length itself)
    message.writeUInt8(6, 4); // Write message type (value, offset)
    message.writeUInt32BE(pieceIndex, 5); // Write piece index
    message.writeUInt32BE(chunkIndex * 16384, 9); // Write begin
    message.writeUInt32BE(16384, 13); // Write length (16 KB)
    return message;
  }

  // TODO: Invalid messages (no length, no type, etc.)
  // TODO: Out of order messages
});
