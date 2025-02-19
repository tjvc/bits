import { BData } from "./b_data";
import { Download } from "./download";
import { logger } from "./logger";
import { Torrent } from "./torrent";
import { TrackerRequest } from "./tracker_request";

import fs from "fs/promises";

async function main() {
  const buf = await fs.readFile(process.argv[2]);
  const bData = new BData(buf);
  const data = bData.decode();
  const torrent = new Torrent(data);

  const infoHash = torrent.infoHash();

  const peerId = "11111111111111111111";
  const trackerRequest = new TrackerRequest(
    peerId,
    torrent.trackerUrl(),
    infoHash
  );
  const trackerResponse = await trackerRequest.send();

  const download = new Download({
    data: new BData(trackerResponse).decode(),
    infoHash: infoHash.raw,
    clientId: Buffer.from(peerId),
    info: torrent.info(),
  });

  download.start();
}

main().catch((e) => logger.error(e));
