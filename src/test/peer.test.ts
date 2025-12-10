import { describe, expect, jest, test } from "@jest/globals";

import fs from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { Handshake } from "../handshake";
import { Peer, PeerParams, PeerState, PieceState } from "../peer";
import { Bitfield } from "../bitfield";
import { logger } from "../logger";

type TestError = Error & { code: string };

describe("Peer", () => {
  test("logs a warning when peer data does not include a peer ID", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(jest.fn());

    const peer = await buildPeer({ id: undefined });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Peer data for ${peer.ip} does not include peer ID`
      )
    );
    warnSpy.mockRestore();
  });

  test("initialises a connection with the peer's IP and port", async () => {
    const peer = await buildPeer();

    const connection = peer.connection;

    expect(connection.ip).toEqual(peer.ip);
    expect(connection.port).toEqual(peer.port);
  });

  test("opens a TCP connection", async () => {
    const peer = await buildPeer();
    const connection = peer.connection;
    const connectSpy = jest
      .spyOn(connection, "connect")
      .mockImplementation(jest.fn<typeof connection.connect>());

    peer.connect();

    expect(connectSpy).toHaveBeenCalled();
  });

  test("emits a disconnect event and updates the state when the connection is closed", async () => {
    const disconnectSpy = jest.fn();
    const peer = await buildPeer({ state: PeerState.Connected });
    peer.on("disconnect", disconnectSpy);

    peer.connection.emit("close");

    expect(disconnectSpy).toHaveBeenCalled();
    expect(peer.state).toEqual("DISCONNECTED");
  });

  test("connects, updates state and sends handshake", async () => {
    const peer = await buildPeer({
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

  describe("on connection refused error", () => {
    test("sets the peer state and failure reason, logs the error, and closes the connection", async () => {
      const peer = await buildPeer({ state: PeerState.Connected });
      const error = new Error("connect ECONNREFUSED");
      (error as TestError).code = "ECONNREFUSED";
      peer.connection.close = jest.fn<typeof peer.connection.close>();
      logger.error = jest.fn();

      peer.connection.emit("error", error);

      expect(peer.failureReason).toEqual("CONNECTION_REFUSED");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Connection error"),
        error
      );
      expect(peer.connection.close).toHaveBeenCalled();
    });
  });

  test("receives handshake message and updates state", async () => {
    const peer = await buildPeer({ state: PeerState.Connected });

    peer.connection.emit(
      "message",
      new Handshake(peer.infoHash, peer.id).data()
    );

    expect(peer.state).toEqual("HANDSHAKE_COMPLETED");
  });

  test("closes connection if another message is received before successful handshake", async () => {
    const peer = await buildPeer();
    const connection = peer.connection;
    const closeSpy = jest
      .spyOn(connection, "close")
      .mockImplementation(jest.fn<typeof connection.close>());

    // 4-byte length prefix, 1-byte message type, bitfield
    connection.emit("message", Buffer.from("0000000505ffffffff", "hex"));

    expect(closeSpy).toHaveBeenCalled();
  });

  test("receives a bitfield message, sets the bitfield and sends an interested message if the peer has required pieces", async () => {
    const peer = await buildPeer({
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
    const peer = await buildPeer({
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
    const peer = await buildPeer();
    const connection = peer.connection;

    connection.emit("message", Buffer.from("0000000101", "hex"));

    expect(peer.state).toEqual("UNCHOKED");
  });

  test("when unchoked, it sends a request message for a required piece offered by the peer, updates its state and marks the piece as downloading", async () => {
    const pieces = [1, 0, 0];
    const bitfield = new Bitfield(Buffer.from([32])); // 00100000
    const peer = await buildPeer({ pieces, bitfield });
    const connection = peer.connection;
    const writeSpy = jest
      .spyOn(connection, "write")
      .mockImplementation(jest.fn<typeof connection.write>());

    connection.emit("message", Buffer.from("0000000101", "hex"));

    expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(2));
    expect(peer.state).toEqual("DOWNLOADING");
    expect(pieces[2]).toEqual(PieceState.Downloading);
  });

  test("upon receiving a piece chunk, it caches it and requests the next", async () => {
    const pieces = [1];
    const currentPiece = 0;
    const peer = await buildPeer({
      pieces,
      currentPiece,
    });
    const currentChunkIndex = 0;
    const chunkMessage = Buffer.concat([
      Buffer.from("0000400007", "hex"), // 4000 = 16 KB length
      Buffer.alloc(16384, currentChunkIndex.toString()),
    ]);
    const writeSpy = jest
      .spyOn(peer.connection, "write")
      .mockImplementation(jest.fn<typeof peer.connection.write>());

    await peer.receive(chunkMessage);

    expect(peer.chunks).toEqual([chunkMessage.subarray(5)]); // 5-byte prefix
    expect(writeSpy).toHaveBeenCalledWith(
      buildPieceMessage(0, currentChunkIndex + 1)
    );
  });

  test("upon receiving the final piece chunk, it writes the piece to disk, emits a piece downloaded event, and requests the first chunk of the next", async () => {
    const pieces = [1, 0];
    const bitfield = new Bitfield(Buffer.from([255])); // 11111111
    const currentPiece = 0;
    const downloadDir = await makeDownloadDir();
    const pieceChunks = Array.from({ length: 16 }, (_, i) =>
      Buffer.alloc(16384, i.toString())
    );
    const peer = await buildPeer({
      pieces,
      bitfield,
      currentPiece,
      downloadDir,
      chunks: pieceChunks.slice(0, -1),
    });
    const finalChunkMessage = Buffer.concat([
      Buffer.from("0000400007", "hex"), // 4000 = 16 KB length
      pieceChunks[15],
    ]);
    peer.emit = jest.fn<typeof peer.emit>();
    const writeSpy = jest
      .spyOn(peer.connection, "write")
      .mockImplementation(jest.fn<typeof peer.connection.write>());

    await peer.receive(finalChunkMessage);

    const downloadedPiece = await fs.readFile(`${downloadDir}/0`);
    expect(downloadedPiece).toEqual(Buffer.concat(pieceChunks));
    expect(peer.emit).toHaveBeenCalledWith("pieceDownloaded");
    expect(writeSpy).toHaveBeenCalledWith(buildPieceMessage(1));
  });

  test.todo(
    "when it fails to download a complete piece, it marks it as not downloaded"
  );

  test.todo(
    "when it finishes downloading a piece and there are no more required pieces, it closes the connection"
  );

  async function makeDownloadDir() {
    return await fs.mkdtemp(join(tmpdir(), "bits-"));
  }

  async function buildPeer(args: Partial<PeerParams> = {}): Promise<Peer> {
    const defaults = {
      ip: Buffer.from("127.0.0.1"),
      port: 54321,
      infoHash: Buffer.alloc(20, 1),
      id: Buffer.alloc(20, 2),
      clientId: Buffer.alloc(20, 3),
      state: PeerState.Disconnected,
      pieces: [],
      bitfield: new Bitfield(Buffer.alloc(0)),
      downloadDir: args.downloadDir || (await makeDownloadDir()),
      pieceLength: 262144,
    };

    const peer = new Peer({ ...defaults, ...args });

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
