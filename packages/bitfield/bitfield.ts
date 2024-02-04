export class Bitfield {
  data: Buffer;

  constructor(data: Buffer) {
    this.data = data;
  }

  get(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    const byte = this.data[byteIndex];
    const mask = 1 << (7 - bitIndex);
    return (byte & mask) !== 0;
  }
}
