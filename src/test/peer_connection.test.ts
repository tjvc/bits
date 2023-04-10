import { describe, expect, jest, test } from "@jest/globals";
import { Socket } from "net";

class PeerConnection {
  constructor(connection: Socket) {
    connection.on("message", (message: string) => {
      connection.write(message);
    });
  }
}

describe("PeerConnection", () => {
  test.todo("creates a TCP connection (on initialisation?)");
  test.todo("sends a handshake message");
  test.todo("receives a handshake message and updates connection state");
  test.todo(
    "receives a bitfield message, sets the bitfield and sends an interested message"
  );
  test.todo(
    "it receives an unchoke message, updates the connection state and sends a request message"
  );
  test.todo("it receives a piece message and ???");
  test.todo("sends keep-alive messages");

  test("writes back messages", () => {
    const connection = new Socket();
    new PeerConnection(connection);

    const mockWrite = jest.fn();
    connection.write = mockWrite as jest.MockedFunction<
      typeof connection.write
    >;

    connection.emit("message", "test");

    expect(mockWrite).toHaveBeenCalledWith("test");
  });

  // TODO: Incomplete messages
  // TODO: Out of order messages
});
