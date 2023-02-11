import { describe, expect, test } from "@jest/globals";
import {
  decode,
  decodeString,
  decodeInt,
  decodeList,
  decodeDict,
} from "./parse";

describe("parse", () => {
  test("it decodes a string buffer", async () => {
    const output = decodeString(Buffer.from("4:test"));
    expect(output).toEqual([Buffer.from("test"), Buffer.from("")]);
  });

  test("it decodes an integer buffer", async () => {
    const output = decodeInt(Buffer.from("i7e"));
    expect(output).toEqual([7, Buffer.from("")]);
  });

  test("it decodes a list buffer", async () => {
    const output = decodeList(Buffer.from("l4:testi7ee"));
    expect(output).toEqual([[Buffer.from("test"), 7], Buffer.from("")]);
  });

  test("it decodes a dict buffer", async () => {
    const output = decodeDict(Buffer.from("d4:spaml1:a1:bee"));
    expect(output).toEqual([
      { spam: [Buffer.from("a"), Buffer.from("b")] },
      Buffer.from(""),
    ]);
  });

  test("it decodes a torrent file buffer", async () => {
    const output = decode(Buffer.from("d4:spaml1:a1:bee"));
    expect(output).toEqual([
      { spam: [Buffer.from("a"), Buffer.from("b")] },
      Buffer.from(""),
    ]);
  });
});
