import { describe, expect, test } from "@jest/globals";
import { Download } from "../download";

describe("Download", () => {
  test("returns valid peers", async () => {
    const peer = { ip: Buffer.from("192.168.2.1"), port: 54321 };
    const download = new Download({
      peers: [peer],
    });
    expect(download.peers).toEqual([peer]);
  });

  test("does not return invalid peers", async () => {
    const download = new Download({
      peers: [{ ip: Buffer.from("192.168.2.1") }],
    });
    expect(download.peers).toEqual([]);
  });

  test("does not error when initialised with unexpected data types", async () => {
    const data = Buffer.from("test");
    expect(() => {
      new Download(data);
    }).not.toThrow();
  });
});
