import { describe, expect, jest, test } from "@jest/globals";

import fs from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { Download } from "../download";
import { Info } from "../info";
import { Peer } from "../peer";

describe("Download", () => {
  test("initialises valid peers", async () => {
    const peer = {
      ip: Buffer.from("192.168.2.1"),
      port: 54321,
      "peer id": Buffer.from("peerId"),
    };
    const download = new Download({
      data: { peers: [peer] },
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
    });

    expect(download.peers[0].ip).toEqual(peer.ip);
  });

  test("does not initialise invalid peers", async () => {
    const download = new Download({
      data: { peers: [{ ip: Buffer.from("192.168.2.1") }] },
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
    });

    expect(download.peers).toEqual([]);
  });

  test("does not error when initialised with unexpected data types", async () => {
    const data = Buffer.from("test");
    expect(() => {
      new Download({
        data,
        infoHash: Buffer.from("infoHash"),
        clientId: Buffer.from("clientId"),
        info: buildInfo(),
      });
    }).not.toThrow();
  });

  test("it starts downloading from multiple peers up to the maximum", async () => {
    const firstPeer = buildMockPeer();
    const secondPeer = buildMockPeer();
    const thirdPeer = buildMockPeer();
    const download = new Download({
      data: {},
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
      maxUploaders: 2,
      peers: [firstPeer, secondPeer, thirdPeer],
    });

    download.start();

    expect(firstPeer.download).toHaveBeenCalled();
    expect(secondPeer.download).toHaveBeenCalled();
    expect(thirdPeer.download).not.toHaveBeenCalled();
  });

  test("when a peer disconnects, it is moved to the back of the queue", async () => {
    const firstPeer = buildMockPeer(function (this: Peer) {
      this.emit("disconnect");
    });
    const secondPeer = buildMockPeer();
    const download = new Download({
      data: {},
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
      maxUploaders: 2,
      peers: [firstPeer, secondPeer],
    });

    download.start();

    expect(download.peers[0]).toEqual(secondPeer);
    expect(download.peers[1]).toEqual(firstPeer);
  });

  test.todo(
    "it periodically starts downloading from new or inactive peers when the maximum is not reached"
  );

  test.todo("it periodically refetches peers from the tracker");

  test("when the final piece is downloaded it finishes the download", () => {
    const peer = buildMockPeer();
    const download = new Download({
      data: {},
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
      maxUploaders: 2,
      peers: [peer],
      pieces: [2, 2],
    });
    jest
      .spyOn(download, "finish")
      .mockImplementation(jest.fn<typeof download.finish>());

    peer.emit("pieceDownloaded");

    expect(download.finish).toHaveBeenCalled();
  });

  test("when the download is finished it concatenates all pieces on disk", async () => {
    const downloadDir = await makeDownloadDir();
    const firstPiece = Buffer.alloc(16384, 1);
    await fs.writeFile(`${downloadDir}/0`, firstPiece);
    const secondPiece = Buffer.alloc(16384, 2);
    await fs.writeFile(`${downloadDir}/1`, secondPiece);
    const peer = buildMockPeer();
    const download = new Download({
      data: {},
      infoHash: Buffer.from("infoHash"),
      clientId: Buffer.from("clientId"),
      info: buildInfo(),
      maxUploaders: 2,
      peers: [peer],
      pieces: [2, 2],
      downloadDir,
    });

    await download.finish();

    const downloadedFile = await fs.readFile(`${downloadDir}/download`);
    expect(downloadedFile).toEqual(Buffer.concat([firstPiece, secondPiece]));
  });

  async function makeDownloadDir() {
    return await fs.mkdtemp(join(tmpdir(), "bits-"));
  }

  function buildInfo() {
    return new Info({
      "piece length": 262144,
      pieces: Buffer.alloc(20),
    });
  }

  function buildMockPeer(downloadMock: () => void = jest.fn()) {
    const mockPeer = class extends Peer {
      download = downloadMock;
    };

    return new mockPeer({
      ip: Buffer.from("192.168.2.1"),
      port: 54321,
      infoHash: Buffer.from("infoHash"),
      id: Buffer.from("id"),
      clientId: Buffer.from("clientId"),
      pieces: [],
      pieceLength: 262144,
    });
  }
});
