import { logger } from "./logger";

export class Handshake {
  static readonly header = Buffer.from("\x13BitTorrent protocol");

  reservedBytes: Buffer = Buffer.from("\x00\x00\x00\x00\x00\x00\x00\x00");
  infoHash: Buffer;
  peerId: Buffer;

  constructor(infoHash: Buffer, peerId: Buffer) {
    this.infoHash = infoHash;
    this.peerId = peerId;
  }

  data(): Buffer {
    return Buffer.concat([
      Handshake.header,
      this.reservedBytes,
      this.infoHash,
      this.peerId,
    ]);
  }

  matches(data: Buffer): boolean {
    const header = data.subarray(0, 20);
    const infoHash = data.subarray(28, 48);
    const peerId = data.subarray(48, 68);

    if (!peerId.equals(this.peerId)) {
      logger.warn("Peer ID in handshake does not match expected value");
    }

    return header.equals(Handshake.header) && infoHash.equals(this.infoHash);
  }
}
