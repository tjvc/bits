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

  describe("typeName", () => {
    test("returns 'Unknown' when data length is less than 5 bytes", () => {
      const data = Buffer.alloc(4);
      const message = new Message(data);

      expect(message.typeName()).toBe("Unknown");
    });

    test("returns formatted name for single word types", () => {
      const data = Buffer.alloc(5);
      data.writeUInt32BE(5, 0);
      data.writeUInt8(MessageType.Choke, 4);
      const message = new Message(data);

      expect(message.typeName()).toBe("Choke");
    });

    test("returns formatted name for camelCase types", () => {
      const data = Buffer.alloc(5);
      data.writeUInt32BE(5, 0);
      data.writeUInt8(MessageType.NotInterested, 4);
      const message = new Message(data);

      expect(message.typeName()).toBe("Not Interested");
    });
  });
});
