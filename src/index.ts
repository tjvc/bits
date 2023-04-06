import { BData } from "./b_data";
import { Info } from "./info";
import fs from "fs/promises";
import https from "https";
import { URL } from "url";
import net from "net";

async function main() {
  const buf = await fs.readFile(process.argv[2]);
  const bData = new BData(buf);
  const data = bData.decode();

  if (data.info) {
    const info = new Info(data.info);
    const encoded = info.hash().urlEncode();

    if (data.announce) {
      const url = new URL(data.announce.toString());

      const params = {
        peer_id: "11111111111111111111",
        port: "6881",
        uploaded: "0",
        downloaded: "0",
        left: "0",
      };

      const queryParams = new URLSearchParams(params);
      url.search = queryParams.toString();
      // info_hash is already percent-encoded, so add it manually
      url.search += "&info_hash=" + encoded;

      https.get(url, (res) => {
        res.on("data", async (d) => {
          const bData = new BData(d);
          const peers = bData.decode().peers;
          peers.forEach((peer) => {
            console.log(peer.ip.toString(), peer.port);
          });

          const handshakeHeader = Buffer.from(
            "\x13BitTorrent protocol\x00\x00\x00\x00\x00\x00\x00\x00"
          );

          const peerId = Buffer.from(params.peer_id);
          const handshake = Buffer.concat([
            handshakeHeader,
            info.hash().raw,
            peerId,
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
        });
      });
    }
  }
}

main();
