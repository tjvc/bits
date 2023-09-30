import { describe, expect, test } from "@jest/globals";

import { Handshake } from "../handshake";

describe("Handshake", () => {
  describe("data", () => {
    test("it returns the correct data", () => {
      const infoHash = Buffer.alloc(20, 1);
      const peerId = Buffer.alloc(20, 2);
      const handshake = new Handshake(infoHash, peerId);

      const expectedData = Buffer.concat([
        Buffer.from("\x13BitTorrent protocol"),
        Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00"),
        infoHash,
        peerId,
      ]);
      expect(handshake.data()).toEqual(expectedData);
    });
  });

  describe("matches", () => {
    test("it returns true if header, infoHash and peerId match the passed data", () => {
      const header = Buffer.from("\x13BitTorrent protocol");
      const reservedBytes = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
      const infoHash = Buffer.alloc(20, 1);
      const peerId = Buffer.alloc(20, 2);
      const data = Buffer.concat([header, reservedBytes, infoHash, peerId]);

      const handshake = new Handshake(infoHash, peerId);

      expect(handshake.matches(data)).toBe(true);
    });

    test("it returns true if reserved bytes do not match the passed data", () => {
      const header = Buffer.from("\x13BitTorrent protocol");
      const reservedBytes = Buffer.from("\x00\x00\x00\x00\x00\x10\x00\x05");
      const infoHash = Buffer.alloc(20, 1);
      const peerId = Buffer.alloc(20, 2);
      const data = Buffer.concat([header, reservedBytes, infoHash, peerId]);

      const handshake = new Handshake(infoHash, peerId);

      expect(handshake.matches(data)).toBe(true);
    });

    test("it returns false if header does not match", () => {
      const header = Buffer.from("bad header");
      const reservedBytes = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
      const infoHash = Buffer.alloc(20, 1);
      const peerId = Buffer.alloc(20, 2);
      const data = Buffer.concat([header, reservedBytes, infoHash, peerId]);

      const handshake = new Handshake(infoHash, peerId);

      expect(handshake.matches(data)).toBe(false);
    });

    test("it returns false if infoHash does not match", () => {
      const header = Buffer.from("\x13BitTorrent protocol");
      const reservedBytes = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
      const ourInfoHash = Buffer.alloc(20, 1);
      const theirInfoHash = Buffer.alloc(20, 3);
      const peerId = Buffer.alloc(20, 2);
      const data = Buffer.concat([
        header,
        reservedBytes,
        theirInfoHash,
        peerId,
      ]);

      const handshake = new Handshake(ourInfoHash, peerId);

      expect(handshake.matches(data)).toBe(false);
    });

    test("it returns false if peerId does not match", () => {
      const header = Buffer.from("\x13BitTorrent protocol");
      const reservedBytes = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
      const infoHash = Buffer.alloc(20, 1);
      const ourPeerId = Buffer.alloc(20, 2);
      const theirPeerId = Buffer.alloc(20, 3);
      const data = Buffer.concat([
        header,
        reservedBytes,
        infoHash,
        theirPeerId,
      ]);

      const handshake = new Handshake(infoHash, ourPeerId);

      expect(handshake.matches(data)).toBe(false);
    });
  });
});
