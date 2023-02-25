import fs from "fs/promises";

type List = (Buffer | number | List | Dict)[];
type Dict = {
  [key: string]: Buffer | number | List | Dict | undefined;
  info?: Dict;
};

async function parse(path: string): Promise<Dict> {
  const buf = await fs.readFile(path);
  return decodeDict(buf)[0];
}

export function decode(buf: Buffer): [Buffer | number | List | Dict, Buffer] {
  if (buf[0] == "i".charCodeAt(0)) {
    const [value, remainder] = decodeInt(buf);
    return [value, remainder];
  } else if (buf[0] == "l".charCodeAt(0)) {
    const [value, remainder] = decodeList(buf);
    return [value, remainder];
  } else if (buf[0] == "d".charCodeAt(0)) {
    const [value, remainder] = decodeDict(buf);
    return [value, remainder];
  } else {
    const [value, remainder] = decodeString(buf);
    return [value, remainder];
  }
}

export function decodeInt(buf: Buffer): [number, Buffer] {
  let i = 0;

  while (buf[i] != "e".charCodeAt(0)) {
    i += 1;
  }
  i += 1;

  return [parseInt(buf.slice(1, i + 1).toString()), buf.slice(i)];
}

export function decodeList(buf: Buffer): [List, Buffer] {
  const list = [];
  buf = buf.slice(1);

  while (buf[0] != "e".charCodeAt(0)) {
    const [value, remainder] = decode(buf);
    list.push(value);
    buf = remainder;
  }

  return [list, buf.slice(1)];
}

export function decodeDict(buf: Buffer): [Dict, Buffer] {
  const dict: Dict = {};
  buf = buf.slice(1);

  while (buf[0] != "e".charCodeAt(0)) {
    const [key, keyRemainder] = decodeString(buf);
    const [value, valueRemainder] = decode(keyRemainder);
    dict[key.toString()] = value;
    buf = valueRemainder;
  }

  return [dict, buf.slice(1)];
}

export function decodeString(buf: Buffer): [Buffer, Buffer] {
  let i = 0;

  while (buf[i] != ":".charCodeAt(0)) {
    i += 1;
  }
  i += 1;

  const len = parseInt(buf.slice(0, i).toString());

  return [buf.slice(i, i + len), buf.slice(i + len)];
}

export function encodeInfo(info: Dict): Buffer {
  let buf = Buffer.from("d");

  for (const [key, value] of Object.entries(info)) {
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

export function urlEncode(buf: Buffer): string {
  const lowercaseLetters = range("a".charCodeAt(0), "z".charCodeAt(0));
  const uppercaseLetters = range("A".charCodeAt(0), "Z".charCodeAt(0));
  const numbers = range("0".charCodeAt(0), "9".charCodeAt(0));
  const symbols = ["-", "_", ".", "~"].map((c) => c.charCodeAt(0));

  const unreservedChars = [
    lowercaseLetters,
    uppercaseLetters,
    numbers,
    symbols,
  ].flat();

  let encodedStr = "";

  buf.forEach((charCode) => {
    if (unreservedChars.includes(charCode)) {
      encodedStr += String.fromCharCode(charCode);
    } else {
      encodedStr += "%" + charCode.toString(16).padStart(2, "0");
    }
  });

  return encodedStr;
}

function range(start: number, end: number): number[] {
  const n = end - start + 1;
  return Array.from(new Array(n), (_, i) => i + start);
}

export default parse;
