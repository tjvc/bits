export enum MessageType {
  Choke = 0,
  Unchoke = 1,
  Interested = 2,
  NotInterested = 3,
  Have = 4,
  Bitfield = 5,
  Request = 6,
  Piece = 7,
  Cancel = 8,
}

export class Message {
  data: Buffer;

  constructor(data: Buffer) {
    this.data = data;
  }

  body(): Buffer {
    return this.data.subarray(5);
  }

  type(): MessageType | null {
    if (this.data.length < 5) {
      return null;
    }
    return this.data.readUInt8(4);
  }

  typeName(): string {
    const messageType = this.type();
    if (messageType === null) {
      return "Unknown";
    }
    return MessageType[messageType].replace(/([A-Z])/g, " $1").trim();
  }
}
