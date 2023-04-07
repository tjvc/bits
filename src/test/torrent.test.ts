import { describe, expect, test } from "@jest/globals";
import { Torrent } from "../torrent";

describe("Torrent", () => {
  test("it does not throw an error when initialised with a valid BDict", async () => {
    expect(() => {
      new Torrent({ announce: Buffer.from("test"), info: {} });
    }).not.toThrow();
  });

  test("it throws an error when initialised with a BDict without an info key of type BDict", async () => {
    expect(() => {
      new Torrent({ announce: Buffer.from("test"), info: [] });
    }).toThrow("Invalid torrent file");
  });

  test("it throws an error when initialised with a BDict without an announce key of type Buffer", async () => {
    expect(() => {
      new Torrent({ info: {} });
    }).toThrow("Invalid torrent file");
  });

  test("it throws an error when initialised with a buffer", async () => {
    expect(() => {
      new Torrent(Buffer.from("test"));
    }).toThrow("Invalid torrent file");
  });

  test("it throws an error when initialised with a number", async () => {
    expect(() => {
      new Torrent(1);
    }).toThrow("Invalid torrent file");
  });

  test("it throws an error when initialised with an array", async () => {
    expect(() => {
      new Torrent([]);
    }).toThrow("Invalid torrent file");
  });
});
