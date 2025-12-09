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
  const info = torrent.info();

  logger.debug("Torrent info:");
  logger.debug("  Tracker URL:", torrent.trackerUrl());
  logger.debug("  Piece count:", info.pieceCount());
  logger.debug("  Piece length:", info.pieceLength(), "bytes");
  logger.debug(
    "  Size: ",
    (info.pieceCount() * info.pieceLength()) / 1024 / 1024,
    "megabytes"
  );

  const peerId = "11111111111111111111";
  const trackerRequest = new TrackerRequest(
    peerId,
    torrent.trackerUrl(),
    infoHash
  );
  const trackerResponse = await trackerRequest.send();

  const trackerData = new BData(trackerResponse).decode();

  const download = new Download({
    data: trackerData,
    infoHash: infoHash.raw,
    clientId: Buffer.from(peerId),
    info: torrent.info(),
  });

  logger.debug("Swarm info:");
  logger.debug("  Total peers:", download.peers.length);

  download.start();
}

main().catch((e) => logger.error(e));
