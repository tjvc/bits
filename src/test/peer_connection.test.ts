import { describe, expect, jest, test } from "@jest/globals";
import { Socket } from "net";

import { PeerConnection, HANDSHAKE_HEADER } from "../peer_connection";

describe("PeerConnection", () => {
  test("opens a TCP connection", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const socket = new Socket();
    const connectSpy = jest
      .spyOn(socket, "connect")
      .mockImplementation(jest.fn<typeof socket.connect>());
    const peerConnection = new PeerConnection(ip, port, socket);

    peerConnection.connect();

    expect(connectSpy).toHaveBeenCalledWith(port, "127.0.0.1");
  });

  test("emits a connect event", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const socket = new Socket();
    const peerConnection = new PeerConnection(ip, port, socket);
    const connectSpy = jest.fn();
    peerConnection.on("connect", connectSpy);

    socket.emit("connect");

    expect(connectSpy).toHaveBeenCalled();
  });

  test("closes a TCP connection", () => {
    const ip = Buffer.from("127.0.0.1");
    const port = 54321;
    const socket = new Socket();
    const connectSpy = jest
      .spyOn(socket, "end")
      .mockImplementation(jest.fn<typeof socket.end>());
    const peerConnection = new PeerConnection(ip, port, socket);

    peerConnection.close();

    expect(connectSpy).toHaveBeenCalled();
  });

  describe("receive", () => {
    function createMessage(
      message: string,
      length: number = message.length
    ): Buffer {
      const messageLength = Buffer.alloc(4);
      messageLength.writeUInt32BE(length, 0);
      return Buffer.concat([messageLength, Buffer.from(message)]);
    }

    function createPeerConnection(
      socket: Socket,
      buffer?: Buffer
    ): PeerConnection {
      const ip = Buffer.from("127.0.0.1");
      const port = 54321;
      return new PeerConnection(ip, port, socket, buffer);
    }

    describe("with an empty buffer and a complete message", () => {
      test("emits a message event with the message data", () => {
        const socket = new Socket();
        const peerConnection = createPeerConnection(socket);
        const message = createMessage("hello");
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", message);

        expect(messageSpy).toHaveBeenCalledTimes(1);
        expect(messageSpy).toHaveBeenCalledWith(message);
        expect(peerConnection.buffer).toEqual(Buffer.alloc(0));
      });
    });

    describe("with an empty buffer and an incomplete message", () => {
      test("buffers the message", () => {
        const socket = new Socket();
        const peerConnection = createPeerConnection(socket);
        const message = createMessage("hell", 5);
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", message);

        expect(messageSpy).not.toHaveBeenCalled();
        expect(peerConnection.buffer).toEqual(message);
      });
    });

    describe("with a non-empty buffer and a now complete message", () => {
      test("emits a message event with the combined message data and clears the buffer", () => {
        const socket = new Socket();
        const bufferedMessage = createMessage("hell", 5);
        const peerConnection = createPeerConnection(socket, bufferedMessage);
        const message = Buffer.from("o");
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", message);

        expect(messageSpy).toHaveBeenCalledTimes(1);
        expect(messageSpy).toHaveBeenCalledWith(
          Buffer.concat([bufferedMessage, message])
        );
        expect(peerConnection.buffer).toEqual(Buffer.alloc(0));
      });
    });

    describe("with a non-empty buffer and a still incomplete message", () => {
      test("appends the message to the buffer", () => {
        const socket = new Socket();
        const bufferedMessage = createMessage("hell", 6);
        const peerConnection = createPeerConnection(socket, bufferedMessage);
        const message = Buffer.from("o");
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", message);

        expect(messageSpy).not.toHaveBeenCalled();
        expect(peerConnection.buffer).toEqual(
          Buffer.concat([bufferedMessage, message])
        );
      });
    });

    describe("with an empty buffer and two complete messages", () => {
      test("emits a message event for both messages", () => {
        const socket = new Socket();
        const firstMessage = createMessage("hello");
        const secondMessage = createMessage("there");
        const peerConnection = createPeerConnection(socket);
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", Buffer.concat([firstMessage, secondMessage]));

        expect(messageSpy).toHaveBeenCalledTimes(2);
        expect(messageSpy).toHaveBeenNthCalledWith(1, firstMessage);
        expect(messageSpy).toHaveBeenNthCalledWith(2, secondMessage);
      });
    });

    describe("with a non-empty buffer, a now complete message, and another complete message", () => {
      test("emits a message event for both messages", () => {
        const socket = new Socket();
        const bufferedMessage = createMessage("hell", 5);
        const incompleteMessage = Buffer.from("o");
        const secondMessage = createMessage("there");
        const peerConnection = createPeerConnection(socket, bufferedMessage);
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", Buffer.concat([incompleteMessage, secondMessage]));

        expect(messageSpy).toHaveBeenCalledTimes(2);
        expect(messageSpy).toHaveBeenNthCalledWith(1, createMessage("hello"));
        expect(messageSpy).toHaveBeenNthCalledWith(2, secondMessage);
      });
    });

    describe("with a non-empty buffer, a now complete message, and another incomplete message", () => {
      test("emits a message event for the complete message and buffers the incomplete message", () => {
        const socket = new Socket();
        const bufferedMessage = createMessage("hell", 5);
        const incompleteMessage = Buffer.from("o");
        const secondMessage = createMessage("ther", 5);
        const peerConnection = createPeerConnection(socket, bufferedMessage);
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", Buffer.concat([incompleteMessage, secondMessage]));

        expect(messageSpy).toHaveBeenCalledTimes(1);
        expect(messageSpy).toHaveBeenCalledWith(createMessage("hello"));
        expect(peerConnection.buffer).toEqual(secondMessage);
      });
    });

    // TODO: Catch and throw a more specific error
    describe("with a message without a valid length", () => {
      test("throws an error and does not emit a message event", () => {
        const socket = new Socket();
        const peerConnection = createPeerConnection(socket);
        const message = Buffer.from("hi");
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        expect(() => {
          socket.emit("data", message);
        }).toThrowError();
        expect(messageSpy).not.toHaveBeenCalled();
      });
    });

    // TODO: We should handle incomplete and multiple messages
    // (I've seen the handshake and bitfield received in a single chunk, for example)
    describe("with a handshake message", () => {
      test("emits a message event with the handshake message", () => {
        const socket = new Socket();
        const peerConnection = createPeerConnection(socket);
        const handshakeMessage = Buffer.concat([
          HANDSHAKE_HEADER,
          Buffer.alloc(20, 1), // Info hash
          Buffer.alloc(20, 2), // Peer ID
        ]);
        const messageSpy = jest.fn();
        peerConnection.on("message", messageSpy);

        socket.emit("data", handshakeMessage);

        expect(messageSpy).toHaveBeenCalledTimes(1);
        expect(messageSpy).toHaveBeenCalledWith(handshakeMessage);
      });
    });

    describe("with a keepalive message", () => {
      test.todo("does not emit a message event");
    });
  });
});
