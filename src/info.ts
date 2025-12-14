import { BDict, BList } from "./b_data";
import { InfoHash } from "./info_hash";

export class Info {
  private info: BDict;

  constructor(info: BDict) {
    this.info = info;
  }

  bencode(info = this.info): Buffer {
    return this.encodeDict(info);
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

  totalLength(): number | null {
    const length = this.info.length;

    if (typeof length === "number") {
      return length;
    } else {
      return null;
    }
  }

  private encodeValue(value: BDict | BList | Buffer | number): Buffer {
    if (typeof value == "number") {
      return this.encodeInt(value);
    } else if (Buffer.isBuffer(value)) {
      return this.encodeBuf(value);
    } else if (Array.isArray(value)) {
      return this.encodeList(value);
    } else {
      return this.bencode(value);
    }
  }

  private encodeDict(bdict: BDict): Buffer {
    const parts = Object.entries(bdict).reduce(
      (acc: Buffer[], [key, value]) => {
        acc.push(Buffer.from(key.length + ":" + key));
        acc.push(this.encodeValue(value));
        return acc;
      },
      []
    );

    return Buffer.concat([Buffer.from("d"), ...parts, Buffer.from("e")]);
  }

  private encodeList(blist: BList): Buffer {
    const parts = blist.reduce((acc: Buffer[], value) => {
      acc.push(this.encodeValue(value));
      return acc;
    }, []);

    return Buffer.concat([Buffer.from("l"), ...parts, Buffer.from("e")]);
  }

  private encodeInt(int: number): Buffer {
    return Buffer.from("i" + int + "e");
  }

  private encodeBuf(buf: Buffer): Buffer {
    return Buffer.concat([Buffer.from(buf.length + ":"), buf]);
  }
}
