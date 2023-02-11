import fs from "fs/promises";

type List = (Buffer | number | List | Dict)[];
type Dict = { [key: string]: Buffer | number | List | Dict };

async function parse(path: string): Promise<Buffer | number | List | Dict> {
  const buf = await fs.readFile(path);
  return decode(buf)[0];
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

export default parse;
