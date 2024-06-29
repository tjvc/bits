//import { BDecoded } from "./b_data";

import { PeerParams } from "./peer";

type InfoParams = {
  pieceLength: number;
  pieces: Buffer;
};

type BDictParams = {
  info: InfoParams;
  announce: Buffer;
  peers: Partial<PeerParams>[];
};

export class BDict {
  info: InfoParams;
  announce: Buffer;

  constructor(data: BDictParams) {
    this.info = data.info;
    this.announce = data.announce;
  }
}
