import { describe, expect, test } from "@jest/globals";
import { Piece } from "../piece";
import { Info } from "../info";

function buildInfo(pieceLength: number, totalLength: number): Info {
  const pieceCount = Math.ceil(totalLength / pieceLength);
  return new Info({
    "piece length": pieceLength,
    pieces: Buffer.alloc(pieceCount * 20),
    length: totalLength,
  });
}

describe("Piece", () => {
  describe("length", () => {
    test("returns standard piece length for first piece", () => {
      const info = buildInfo(262144, 1000000);
      const piece = new Piece(0, info, 16384);

      expect(piece.length()).toEqual(262144);
    });

    test("returns standard piece length for middle piece", () => {
      const info = buildInfo(262144, 1000000);
      const piece = new Piece(2, info, 16384);

      expect(piece.length()).toEqual(262144);
    });

    test("returns remainder for last piece when total length does not divide evenly", () => {
      // 5 pieces: 4 full (4 × 262144 = 1048576) + last partial (101760)
      // Total = 1048576 + 101760 = 1150336
      // Last piece = 1150336 - 1048576 = 101760
      const info = buildInfo(262144, 1150336);
      const piece = new Piece(4, info, 16384);

      expect(piece.length()).toEqual(101760);
    });

    test("returns standard piece length for last piece when total length divides evenly", () => {
      // 4 pieces of 262144 = 1048576 exactly
      const info = buildInfo(262144, 1048576);
      const piece = new Piece(3, info, 16384);

      expect(piece.length()).toEqual(262144);
    });

    test("handles single piece torrent", () => {
      const info = buildInfo(262144, 100000);
      const piece = new Piece(0, info, 16384);

      expect(piece.length()).toEqual(100000);
    });
  });

  describe("chunksNeeded", () => {
    test("calculates chunks needed for a full piece", () => {
      const info = buildInfo(262144, 1150336);
      const piece = new Piece(0, info, 16384);

      // 262144 / 16384 = 16 chunks exactly
      expect(piece.chunksNeeded()).toEqual(16);
    });

    test("rounds up chunks needed for last piece", () => {
      const info = buildInfo(262144, 1150336);
      const piece = new Piece(4, info, 16384);

      // Last piece is 101760 bytes
      // 101760 / 16384 = 6.21... -> 7 chunks
      expect(piece.chunksNeeded()).toEqual(7);
    });

    test("handles piece smaller than one chunk", () => {
      const info = buildInfo(8192, 8192);
      const piece = new Piece(0, info, 16384);

      expect(piece.chunksNeeded()).toEqual(1);
    });
  });
});
