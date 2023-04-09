import { describe, expect, test } from "@jest/globals";
import { Download } from "../download";

describe("Download", () => {
  test("returns valid peers", async () => {
    const download = new Download({
      peers: [{ ip: Buffer.from("192.168.2.1"), port: 54321 }],
    });
    expect(download.peers).toEqual([{ ip: "192.168.2.1", port: 54321 }]);
  });

  test("does not return invalid peers", async () => {
    const download = new Download({
      peers: [{ ip: Buffer.from("192.168.2.1") }],
    });
    expect(download.peers).toEqual([]);
  });
});
