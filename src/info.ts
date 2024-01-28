import { BDict } from "./b_data";
import { InfoHash } from "./info_hash";

export class Info {
  private info: BDict;

  constructor(info: BDict) {
    this.info = info;
  }

  bencode(): Buffer {
    let buf = Buffer.from("d");

    for (const [key, value] of Object.entries(this.info)) {
      const keyBuf = Buffer.from(key.length + ":" + key);

      let valueBuf;
      if (typeof value == "number") {
        valueBuf = Buffer.from("i" + value + "e");
      } else if (Buffer.isBuffer(value)) {
        valueBuf = Buffer.concat([Buffer.from(value.length + ":"), value]);
      } else {
        throw new Error("Unhandled data type");
      }

      buf = Buffer.concat([buf, keyBuf, valueBuf]);
    }

    return Buffer.concat([buf, Buffer.from("e")]);
  }

  hash(): InfoHash {
    return new InfoHash(this.bencode());
  }

  pieceLength(): number {
    const pieceLength = this.info["piece length"];

    if (typeof pieceLength === "number") {
      return pieceLength;
    } else {
      throw new Error("Invalid piece length");
    }
  }

  pieceCount(): number {
    const pieces = this.info.pieces;

    if (Buffer.isBuffer(pieces)) {
      return pieces.length / 20;
    } else {
      throw new Error("Invalid pieces");
    }
  }
}
