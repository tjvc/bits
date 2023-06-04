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

  isComplete(): boolean {
    if (this.data.length === this.length()) {
      return true;
    }
    return false;
  }

  type(): MessageType | null {
    if (this.data.length < 5) {
      return null;
    }
    return this.data.readUInt8(4);
  }

  append(data: Buffer) {
    this.data = Buffer.concat([this.data, data]);
  }

  private length(): number {
    if (this.data.length < 4) {
      return 0;
    }
    return this.data.readUInt32BE(0);
  }
}