export enum MessageType {
  Unchoke = 1,
  Bitfield = 5,
}

export class Message {
  data: Buffer;

  constructor(data: Buffer) {
    this.data = data;
  }

  body(): Buffer {
    return this.data.slice(5);
  }

  type(): MessageType | null {
    if (this.data.length < 5) {
      return null;
    }
    return this.data.readUInt8(4);
  }
}
