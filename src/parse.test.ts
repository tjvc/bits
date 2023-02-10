import { describe, expect, test } from "@jest/globals";
import parse from "./parse";

describe("parse", () => {
  test("it decodes a string", async () => {
    const data = await parse("src/string.torrent");
    expect(data).toEqual(["test", ""]);
  });

  test("it decodes an integer", async () => {
    const data = await parse("src/integer.torrent");
    expect(data).toEqual([7, ""]);
  });

  test("it decodes a list", async () => {
    const data = await parse("src/list.torrent");
    expect(data).toEqual([["test", 7], ""]);
  });
});
