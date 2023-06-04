import { describe, expect, test } from "@jest/globals";
import { Message, MessageType } from "../message"; // Update the import path to your Message class

describe("Message", () => {
  describe("body", () => {
    test("returns empty buffer when data length is less than 5 bytes", () => {
      const data = Buffer.from([0, 0, 0, 0]);
      const message = new Message(data);

      expect(message.body()).toEqual(Buffer.alloc(0));
    });

    test("returns the message body", () => {
      const data = Buffer.alloc(6);
      data.writeUInt32BE(6, 0);
      data.writeUInt8(1, 4);
      data.write("a", 5);
      const message = new Message(data);

      expect(message.body()).toEqual(Buffer.from("a"));
    });
  });

  describe("isComplete", () => {
    test("returns true when length is equal to message length", () => {
      const data = Buffer.alloc(6);
      data.writeUInt32BE(6, 0);
      data.writeUInt8(1, 4);
      data.write("a", 5);
      const message = new Message(data);

      expect(message.isComplete()).toBe(true);
    });

    test("returns false when length is less than message length", () => {
      const data = Buffer.alloc(6);
      data.writeUInt32BE(7, 0);
      data.writeUInt8(1, 4);
      data.write("a", 5);
      const message = new Message(data);

      expect(message.isComplete()).toBe(false);
    });
  });

  describe("type", () => {
    test("returns null when data length is less than 5 bytes", () => {
      const data = Buffer.alloc(4);
      data.writeUInt32BE(4, 0);
      const message = new Message(data);

      expect(message.type()).toBeNull();
    });

    test("returns unchoke when message is unchoke", () => {
      const data = Buffer.alloc(5);
      data.writeUInt32BE(5, 0);
      data.writeUInt8(MessageType.Unchoke, 4);
      const message = new Message(data);

      expect(message.type()).toBe(MessageType.Unchoke);
    });

    test("returns bitfield when message is bitfield", () => {
      const data = Buffer.alloc(5);
      data.writeUInt32BE(5, 0);
      data.writeUInt8(MessageType.Bitfield, 4);
      const message = new Message(data);

      expect(message.type()).toBe(MessageType.Bitfield);
    });
  });

  describe("append", () => {
    test("appends data to the message", () => {
      const data = Buffer.from("a");
      const message = new Message(data);
      const newData = Buffer.from("b");

      message.append(newData);

      expect(message.data).toEqual(Buffer.from("ab"));
    });
  });
});
