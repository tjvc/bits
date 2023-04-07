import { BDecoded, BDict } from "./b_data";
import { Info } from "./info";

export class Torrent {
  private announce: Buffer;
  private info_dict: BDict;

  constructor(data: BDecoded) {
    if (typeof data === "object" && "announce" in data && "info" in data) {
      if (Buffer.isBuffer(data.announce)) {
        this.announce = data.announce;
      } else {
        throw new Error("Invalid torrent file");
      }
      if (
        typeof data.info !== "number" &&
        !Buffer.isBuffer(data.info) &&
        !Array.isArray(data.info)
      ) {
        this.info_dict = data.info;
      } else {
        throw new Error("Invalid torrent file");
      }
    } else {
      throw new Error("Invalid torrent file");
    }
  }

  trackerUrl(): string {
    return this.announce.toString();
  }

  info(): Info {
    return new Info(this.info_dict);
  }
}
