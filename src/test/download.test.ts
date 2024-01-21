import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { Download } from "../download";
import { Peer } from "../peer";

jest.mock("../peer");

describe("Download", () => {
  let mockMethods: jest.Mock[];

  beforeEach(() => {
    (Peer as jest.Mock).mockClear();
    mockMethods = [];
  });

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

    expect(download.peers.length).toEqual(1);
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
    (Peer as jest.Mock).mockImplementation(() => {
      const mockMethod = jest.fn();
      mockMethods.push(mockMethod);
      return {
        download: mockMethod,
      };
    });
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
      2
    );

    download.start();

    expect(mockMethods[0]).toHaveBeenCalled();
    expect(mockMethods[1]).toHaveBeenCalled();
    expect(mockMethods[2]).not.toHaveBeenCalled();
  });
});
