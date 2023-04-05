import { describe, expect, test } from "@jest/globals";
import { BData } from "../b_data";

describe("BData", () => {
  test("it decodes a buffer containing dict, list, string and number values", async () => {
    const bData = new BData(
      Buffer.from("d4:dictd1:ai1ee4:listl1:a1:be6:numberi8e6:string5:helloe")
    );
    expect(bData.decode()).toEqual({
      dict: { a: 1 },
      list: [Buffer.from("a"), Buffer.from("b")],
      string: Buffer.from("hello"),
      number: 8,
    });
  });

  test("it decodes a string buffer", async () => {
    const bData = new BData(Buffer.from("4:test"));
    expect(bData.decode()).toEqual(Buffer.from("test"));
  });

  test("it decodes an integer buffer", async () => {
    const bData = new BData(Buffer.from("i7e"));
    expect(bData.decode()).toEqual(7);
  });

  test("it decodes a list buffer", async () => {
    const bData = new BData(Buffer.from("l4:testi7ee"));
    expect(bData.decode()).toEqual([Buffer.from("test"), 7]);
  });

  test("it decodes a dict buffer", async () => {
    const bData = new BData(Buffer.from("d4:spaml1:a1:bee"));
    expect(bData.decode()).toEqual({
      spam: [Buffer.from("a"), Buffer.from("b")],
    });
  });
});
