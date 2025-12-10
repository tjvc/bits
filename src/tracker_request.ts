import { InfoHash } from "./info_hash";

export class TrackerRequest {
  private peerId: string;
  private trackerUrl: string;
  private infoHash: InfoHash;
  private params: Record<string, string>;

  constructor(peerId: string, trackerUrl: string, infoHash: InfoHash) {
    this.peerId = peerId;
    this.trackerUrl = trackerUrl;
    this.infoHash = infoHash;

    this.params = {
      peer_id: this.peerId,
      port: "6881",
      uploaded: "0",
      downloaded: "0",
      left: "0",
    };
  }

  async send(): Promise<Buffer> {
    const url = new URL(this.trackerUrl);
    const queryParams = new URLSearchParams(this.params);

    url.search = queryParams.toString();
    // info_hash is already percent-encoded, so add it manually
    url.search += "&info_hash=" + this.infoHash.urlEncode();

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
