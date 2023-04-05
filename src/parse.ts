import fs from "fs/promises";
import { BData, BDict } from "./b_data";

async function parse(path: string): Promise<BDict> {
  const buf = await fs.readFile(path);
  const bData = new BData(buf);
  return bData.decode();
}

export function encodeInfo(info: BDict): Buffer {
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
