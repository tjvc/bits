export enum PieceState {
  Required = 0,
  Downloading = 1,
  Downloaded = 2,
}

import { Info } from "./info";

export class Piece {
  readonly index: number;
  state: PieceState;
  private readonly info: Info;
  private readonly chunkLength: number;

  constructor(index: number, info: Info, chunkLength: number) {
    this.index = index;
    this.info = info;
    this.chunkLength = chunkLength;
    this.state = PieceState.Required;
  }

  length(): number {
    const isLast = this.index === this.info.pieceCount() - 1;
    const totalLength = this.info.totalLength();
    if (totalLength === null) {
      throw new Error("Total length is not available");
    }
    const remainder = totalLength % this.info.pieceLength();
    return isLast && remainder > 0 ? remainder : this.info.pieceLength();
  }

  chunksNeeded(): number {
    return Math.ceil(this.length() / this.chunkLength);
  }
}
