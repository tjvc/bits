import parse, { encodeInfo } from "./parse";
import crypto from "crypto";

const result = parse(process.argv[2]);

result.then((data) => {
  console.log(data);

  if (data.info) {
    const info = data.info;
    const shasum = crypto.createHash("sha1");
    shasum.update(encodeInfo(info));
    const digest = shasum.digest();
    console.log(digest);
  }
});
