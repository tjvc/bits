import { describe, expect, test } from "@jest/globals";
import { BDecoder } from "../b_decoder";

describe("BDecoder", () => {
  test("it decodes a buffer containing dict, list, string and number values", async () => {
    const decoder = new BDecoder();
    const output = decoder.decode(
      Buffer.from("d4:dictd1:ai1ee4:listl1:a1:be6:numberi8e6:string5:helloe")
    );
    expect(output).toEqual({
      dict: { a: 1 },
      list: [Buffer.from("a"), Buffer.from("b")],
      string: Buffer.from("hello"),
      number: 8,
    });
  });

  test("it decodes a string buffer", async () => {
    const decoder = new BDecoder();
    const output = decoder.decodeString(Buffer.from("4:test"));
    expect(output).toEqual([Buffer.from("test"), Buffer.from("")]);
  });

  test("it decodes an integer buffer", async () => {
    const decoder = new BDecoder();
    const output = decoder.decodeInt(Buffer.from("i7e"));
    expect(output).toEqual([7, Buffer.from("")]);
  });

  test("it decodes a list buffer", async () => {
    const decoder = new BDecoder();
    const output = decoder.decodeList(Buffer.from("l4:testi7ee"));
    expect(output).toEqual([[Buffer.from("test"), 7], Buffer.from("")]);
  });

  test("it decodes a dict buffer", async () => {
    const decoder = new BDecoder();
    const output = decoder.decodeDict(Buffer.from("d4:spaml1:a1:bee"));
    expect(output).toEqual([
      { spam: [Buffer.from("a"), Buffer.from("b")] },
      Buffer.from(""),
    ]);
  });
});
