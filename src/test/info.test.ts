import { describe, expect, test } from "@jest/globals";
import { Info } from "../info";

describe("Info", () => {
  test("it encodes an info dict", async () => {
    const infoDict = {
      length: 2,
      name: Buffer.from("yolo"),
      "piece length": 1,
      pieces: Buffer.from("ab"),
      // Multi-file torrents will include a file list
      files: [
        {
          length: 3,
          path: [Buffer.from("path"), Buffer.from("to"), Buffer.from("file")],
        },
        // For completeness, test that we can recursively encode a list (not representative of read world data)
        [Buffer.from("cd"), 4],
      ],
    };

    const info = new Info(infoDict);

    expect(info.bencode().toString()).toEqual(
      "d6:lengthi2e4:name4:yolo12:piece lengthi1e6:pieces2:ab5:filesld6:lengthi3e4:pathl4:path2:to4:fileeel2:cdi4eeee"
    );
  });

  test("it returns the piece count", async () => {
    const infoDict = {
      pieces: Buffer.from("aaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbb"),
    };

    const info = new Info(infoDict);

    expect(info.pieceCount()).toEqual(2);
  });

  test("it throws an error when the piece count is invalid", async () => {
    const infoDict = {};

    const info = new Info(infoDict);

    expect(() => {
      info.pieceCount();
    }).toThrow("Invalid pieces");
  });
});
