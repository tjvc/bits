import { describe, expect, test } from "@jest/globals";
import { Bitfield } from "../bitfield";

describe("Bitfield", () => {
  test("returns correct bit values", () => {
    const data = Buffer.from([18, 32]); // 00010010 00100000

    const bitfield = new Bitfield(data);

    expect(bitfield.get(0)).toBe(false);
    expect(bitfield.get(1)).toBe(false);
    expect(bitfield.get(2)).toBe(false);
    expect(bitfield.get(3)).toBe(true);
    expect(bitfield.get(4)).toBe(false);
    expect(bitfield.get(5)).toBe(false);
    expect(bitfield.get(6)).toBe(true);
    expect(bitfield.get(7)).toBe(false);

    expect(bitfield.get(8)).toBe(false);
    expect(bitfield.get(10)).toBe(true);
  });
});
