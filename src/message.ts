export enum MessageType {
  Unchoke = 1,
  Bitfield = 5,
  Piece = 7,
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
}
