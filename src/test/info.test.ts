import { describe, expect, test } from "@jest/globals";
import { Info } from "../info";

describe("Info", () => {
  test("it encodes an info dict", async () => {
    const infoDict = {
      length: 2,
      name: Buffer.from("yolo"),
      "piece length": 1,
      pieces: Buffer.from("ab"),
    };

    const info = new Info(infoDict);

    expect(info.bencode()).toEqual(
      Buffer.from("d6:lengthi2e4:name4:yolo12:piece lengthi1e6:pieces2:abe")
    );
  });
});
