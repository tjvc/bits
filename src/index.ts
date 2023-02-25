import parse, { encodeInfo, urlEncode } from "./parse";
import crypto from "crypto";
import https from "https";
import { URL } from "url";

const result = parse(process.argv[2]);

result.then((data) => {
  if (data.info) {
    const info = data.info;
    const shasum = crypto.createHash("sha1");
    shasum.update(encodeInfo(info));
    const digest = shasum.digest();
    const encoded = urlEncode(digest);

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
        res.on("data", (d) => {
          console.log(d.toString());
        });
      });
    }
  }
});
