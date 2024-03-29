export type BDecoded = Buffer | number | BList | BDict;
export type BList = BDecoded[];
export type BDict = {
  [key: string]: BDecoded;
};

export class BData {
  private data: Buffer;

  constructor(data: Buffer) {
    this.data = data;
  }

  decode(): Buffer | number | BList | BDict {
    return this.decodeAll(this.data)[0];
  }

  private decodeAll(buf: Buffer): [BDecoded, Buffer] {
    if (buf[0] == "i".charCodeAt(0)) {
      const [value, remainder] = this.decodeInt(buf);
      return [value, remainder];
    } else if (buf[0] == "l".charCodeAt(0)) {
      const [value, remainder] = this.decodeList(buf);
      return [value, remainder];
    } else if (buf[0] == "d".charCodeAt(0)) {
      const [value, remainder] = this.decodeDict(buf);
      return [value, remainder];
    } else {
      const [value, remainder] = this.decodeString(buf);
      return [value, remainder];
    }
  }

  private decodeInt(buf: Buffer): [number, Buffer] {
    let i = 0;

    while (buf[i] != "e".charCodeAt(0)) {
      i += 1;
    }
    i += 1;

    return [parseInt(buf.slice(1, i + 1).toString()), buf.slice(i)];
  }

  private decodeList(buf: Buffer): [BList, Buffer] {
    const list = [];
    buf = buf.slice(1);

    while (buf[0] != "e".charCodeAt(0)) {
      const [value, remainder] = this.decodeAll(buf);
      list.push(value);
      buf = remainder;
    }

    return [list, buf.slice(1)];
  }

  private decodeDict(buf: Buffer): [BDict, Buffer] {
    const dict: BDict = {};
    buf = buf.slice(1);

    while (buf[0] != "e".charCodeAt(0)) {
      const [key, keyRemainder] = this.decodeString(buf);
      const [value, valueRemainder] = this.decodeAll(keyRemainder);
      dict[key.toString()] = value;
      buf = valueRemainder;
    }

    return [dict, buf.slice(1)];
  }

  private decodeString(buf: Buffer): [Buffer, Buffer] {
    let i = 0;

    while (buf[i] != ":".charCodeAt(0)) {
      i += 1;
    }
    i += 1;

    const len = parseInt(buf.slice(0, i).toString());

    return [buf.slice(i, i + len), buf.slice(i + len)];
  }
}
