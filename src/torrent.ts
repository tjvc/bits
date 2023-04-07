import { BDecoded, BDict } from "./b_data";
import { Info } from "./info";

export class Torrent {
  private announce: Buffer;
  private info_dict: BDict;

  constructor(data: BDecoded) {
    if (
      !this.isBDict(data) ||
      !this.isBuffer(data.announce) ||
      !this.isBDict(data.info)
    ) {
      throw new Error("Invalid torrent file");
    }

    this.announce = data.announce;
    this.info_dict = data.info;
  }

  private isBDict(data: BDecoded): data is BDict {
    return data?.constructor == Object;
  }

  private isBuffer(data: BDecoded): data is Buffer {
    return data?.constructor == Buffer;
  }

  trackerUrl(): string {
    return this.announce.toString();
  }

  info(): Info {
    return new Info(this.info_dict);
  }
}
