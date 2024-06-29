import { describe, expect, test } from "@jest/globals";
import { BDict } from "../b_dict";

describe("BDict", () => {
  test("it returns info", () => {
    const info = { pieceLength: 1, pieces: new Buffer("pieces") };
    const bdict = new BDict({
      info: info,
      announce: new Buffer("announce"),
      peers: [{ ip: new Buffer("ip") }],
    });

    expect(bdict.info).toEqual(info);
  });

  test("it returns announce", () => {
    const announce = new Buffer("announce");
    const bdict = new BDict({
      info: { pieceLength: 1, pieces: new Buffer("pieces") },
      announce: announce,
      peers: [{ ip: new Buffer("ip") }],
    });

    expect(bdict.announce).toEqual(announce);
  });
});
