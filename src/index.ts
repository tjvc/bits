import { BData } from "./b_data";
import { Torrent } from "./torrent";
import { Download } from "./download";
import { TrackerRequest } from "./tracker_request";

import fs from "fs/promises";
import net from "net";

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

  const download = new Download(new BData(trackerResponse).decode());
  const peers = download.peers;
  peers.forEach((peer) => {
    console.log(peer.ip, peer.port);
  });

  const handshakeHeader = Buffer.from(
    "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00"
  );

  const handshake = Buffer.concat([
    handshakeHeader,
    infoHash.raw,
    Buffer.from(peerId),
  ]);

  const peer = peers[Math.floor(Math.random() * peers.length)];
  const client = net.createConnection(peer.port, peer.ip.toString());

  client.on("connect", () => {
    console.log("connected");
  });

  client.on("data", (data) => {
    console.log(data);
  });

  client.on("close", () => {
    console.log("closed");
  });

  console.log("Sending handshake");
  client.write(handshake);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const interested = Buffer.from([0, 0, 0, 1, 2]);
  console.log("Sending interested");
  client.write(interested);

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
