import { describe, expect, test } from "@jest/globals";
import { encodeInfo, urlEncode } from "./parse";

describe("parse", () => {
  test("it encodes an info object", async () => {
    const info = {
      length: 2,
      name: Buffer.from("yolo"),
      "piece length": 1,
      pieces: Buffer.from("ab"),
    };

    expect(encodeInfo(info)).toEqual(
      Buffer.from("d6:lengthi2e4:name4:yolo12:piece lengthi1e6:pieces2:abe")
    );
  });

  test("it URL-encodes a buffer", async () => {
    const buffer = Buffer.from("013031a6", "hex");
    expect(urlEncode(buffer)).toEqual("%0101%a6");
  });
});
