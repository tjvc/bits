import { describe, test } from "@jest/globals";

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

  // TODO: Incomplete messages
  // TODO: Out of order messages
});
