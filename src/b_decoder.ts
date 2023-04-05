type BList = (Buffer | number | BList | BDict)[];
export type BDict = {
  [key: string]: Buffer | number | BList | BDict;
};

export class BDecoder {
  decode(buf: Buffer): Buffer | number | BList | BDict {
    return this.decodeAny(buf)[0];
  }

  decodeAny(buf: Buffer): [Buffer | number | BList | BDict, Buffer] {
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

  decodeInt(buf: Buffer): [number, Buffer] {
    let i = 0;

    while (buf[i] != "e".charCodeAt(0)) {
      i += 1;
    }
    i += 1;

    return [parseInt(buf.slice(1, i + 1).toString()), buf.slice(i)];
  }

  decodeList(buf: Buffer): [BList, Buffer] {
    const list = [];
    buf = buf.slice(1);

    while (buf[0] != "e".charCodeAt(0)) {
      const [value, remainder] = this.decodeAny(buf);
      list.push(value);
      buf = remainder;
    }

    return [list, buf.slice(1)];
  }

  decodeDict(buf: Buffer): [BDict, Buffer] {
    const dict: BDict = {};
    buf = buf.slice(1);

    while (buf[0] != "e".charCodeAt(0)) {
      const [key, keyRemainder] = this.decodeString(buf);
      const [value, valueRemainder] = this.decodeAny(keyRemainder);
      dict[key.toString()] = value;
      buf = valueRemainder;
    }

    return [dict, buf.slice(1)];
  }

  decodeString(buf: Buffer): [Buffer, Buffer] {
    let i = 0;

    while (buf[i] != ":".charCodeAt(0)) {
      i += 1;
    }
    i += 1;

    const len = parseInt(buf.slice(0, i).toString());

    return [buf.slice(i, i + len), buf.slice(i + len)];
  }
}
