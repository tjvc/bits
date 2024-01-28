import { describe, expect, jest, test } from "@jest/globals";
import { Download } from "../download";
import { Peer } from "../peer";

describe("Download", () => {
  test("initialises valid peers", async () => {
    const peer = {
      ip: Buffer.from("192.168.2.1"),
      port: 54321,
      "peer id": Buffer.from("peerId"),
    };
    const download = new Download(
      {
        peers: [peer],
      },
      Buffer.from("infoHash"),
      Buffer.from("clientId"),
      0
    );

    expect(download.peers[0].ip).toEqual(peer.ip);
  });

  test("does not initialise invalid peers", async () => {
    const download = new Download(
      {
        peers: [{ ip: Buffer.from("192.168.2.1") }],
      },
      Buffer.from("infoHash"),
      Buffer.from("clientId"),
      0
    );

    expect(download.peers).toEqual([]);
  });

  test("does not error when initialised with unexpected data types", async () => {
    const data = Buffer.from("test");
    expect(() => {
      new Download(data, Buffer.from("infoHash"), Buffer.from("clientId"), 0);
    }).not.toThrow();
  });

  test("it starts downloading from multiple peers up to the maximum", async () => {
    const firstPeer = buildMockPeer();
    const secondPeer = buildMockPeer();
    const thirdPeer = buildMockPeer();
    const download = new Download(
      {},
      Buffer.from("infoHash"),
      Buffer.from("clientId"),
      0,
      2,
      [firstPeer, secondPeer, thirdPeer]
    );

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
    const download = new Download(
      {},
      Buffer.from("infoHash"),
      Buffer.from("clientId"),
      0,
      2,
      [firstPeer, secondPeer]
    );

    download.start();

    expect(download.peers[0]).toEqual(secondPeer);
    expect(download.peers[1]).toEqual(firstPeer);
  });

  test.todo(
    "it periodically starts downloading from new or inactive peers when the maximum is not reached"
  );

  test.todo("it periodically refetches peers from the tracker");

  function buildMockPeer(downloadMock: () => void = jest.fn()) {
    const mockPeer = class extends Peer {
      download = downloadMock;
    };

    return new mockPeer(
      Buffer.from("192.168.2.1"),
      54321,
      Buffer.from("infoHash"),
      Buffer.from("id"),
      Buffer.from("clientId"),
      []
    );
  }
});
