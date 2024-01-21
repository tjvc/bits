import { beforeEach, describe, expect, jest, test } from "@jest/globals";
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
      Buffer.from("clientId")
    );

    expect(download.peers[0].ip).toEqual(peer.ip);
  });

  test("does not initialise invalid peers", async () => {
    const download = new Download(
      {
        peers: [{ ip: Buffer.from("192.168.2.1") }],
      },
      Buffer.from("infoHash"),
      Buffer.from("clientId")
    );

    expect(download.peers).toEqual([]);
  });

  test("does not error when initialised with unexpected data types", async () => {
    const data = Buffer.from("test");
    expect(() => {
      new Download(data, Buffer.from("infoHash"), Buffer.from("clientId"));
    }).not.toThrow();
  });

  test("it starts downloading from multiple peers up to the maximum", async () => {
    const mockedDownloads: jest.Mock[] = [];
    const mockPeerClass = class extends Peer {
      constructor(...args: ConstructorParameters<typeof Peer>) {
        super(...args);
        const mockedDownload = jest.fn();
        mockedDownloads.push(mockedDownload);
        this.download = mockedDownload;
      }
    };
    const peers = [
      {
        ip: Buffer.from("192.168.2.1"),
        port: 54321,
        "peer id": Buffer.from("peerId"),
      },
      {
        ip: Buffer.from("192.168.2.2"),
        port: 54321,
        "peer id": Buffer.from("peerId"),
      },
      {
        ip: Buffer.from("192.168.2.3"),
        port: 54321,
        "peer id": Buffer.from("peerId"),
      },
    ];
    const download = new Download(
      {
        peers: peers,
      },
      Buffer.from("infoHash"),
      Buffer.from("clientId"),
      2,
      mockPeerClass
    );

    download.start();

    expect(mockedDownloads[0]).toHaveBeenCalled();
    expect(mockedDownloads[1]).toHaveBeenCalled();
    expect(mockedDownloads[2]).not.toHaveBeenCalled();
  });
});
