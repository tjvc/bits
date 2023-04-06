import { describe, expect, test } from "@jest/globals";
import { InfoHash } from "../info_hash";

describe("InfoHash", () => {
  test("it returns a SHA1 digest", async () => {
    const info = Buffer.from("test");
    const infoHash = new InfoHash(info);
    expect(infoHash.raw).toEqual(
      Buffer.from("a94a8fe5ccb19ba61c4c0873d391e987982fbbd3", "hex")
    );
  });

  test("it returns the URL-encoded hash", async () => {
    const info = Buffer.from("013031a6", "hex");
    const infoHash = new InfoHash(info, (data: Buffer) => data);
    expect(infoHash.urlEncode()).toEqual("%0101%a6");
  });
});
