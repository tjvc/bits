import { describe, expect, test } from "@jest/globals";
import { Download } from "../download";

describe("Download", () => {
  test("returns valid peers", async () => {
    const peer = { ip: Buffer.from("192.168.2.1"), port: 54321 };
    const download = new Download(
      {
        peers: [peer],
      },
      Buffer.from("123"),
      "456"
    );

    expect(download.peers[0].ip).toEqual(peer.ip);
    expect(download.peers[0].port).toEqual(peer.port);
  });

  test("does not return invalid peers", async () => {
    const download = new Download(
      {
        peers: [{ ip: Buffer.from("192.168.2.1") }],
      },
      Buffer.from("123"),
      "456"
    );

    expect(download.peers).toEqual([]);
  });

  test("does not error when initialised with unexpected data types", async () => {
    const data = Buffer.from("test");
    expect(() => {
      new Download(data, Buffer.from("123"), "456");
    }).not.toThrow();
  });
});
