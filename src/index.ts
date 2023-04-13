import { BData } from "./b_data";
import { Download } from "./download";
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

  const download = new Download(
    new BData(trackerResponse).decode(),
    infoHash.raw,
    peerId
  );
  const peers = download.peers;
  peers.forEach((peer) => {
    console.log(peer.ip, peer.port);
  });

  const peer = peers[Math.floor(Math.random() * peers.length)];
  peer.connect();

  const client = peer.connection;

  client.on("data", (data) => {
    console.log(data);
  });

  client.on("close", () => {
    console.log("closed");
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const request = Buffer.alloc(17);
  request.writeUInt32BE(13);
  request.writeUInt8(6, 4);
  request.writeUInt32BE(32, 5);
  request.writeUInt32BE(0, 9);
  request.writeUInt32BE(256, 13);

  console.log("Requesting piece");
  client.write(request);
}

main();
