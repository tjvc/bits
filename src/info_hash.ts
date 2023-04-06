import crypto from "crypto";

export class InfoHash {
  raw: Buffer;

  constructor(
    bencodedInfo: Buffer,
    alg: (data: Buffer) => Buffer = InfoHash.sha1Digest
  ) {
    this.raw = alg(bencodedInfo);
  }

  private static sha1Digest(data: Buffer) {
    return crypto.createHash("sha1").update(data).digest();
  }

  urlEncode(): string {
    const lowercaseLetters = this.range("a".charCodeAt(0), "z".charCodeAt(0));
    const uppercaseLetters = this.range("A".charCodeAt(0), "Z".charCodeAt(0));
    const numbers = this.range("0".charCodeAt(0), "9".charCodeAt(0));
    const symbols = ["-", "_", ".", "~"].map((c) => c.charCodeAt(0));

    const unreservedChars = [
      lowercaseLetters,
      uppercaseLetters,
      numbers,
      symbols,
    ].flat();

    let encodedStr = "";

    this.raw.forEach((charCode) => {
      if (unreservedChars.includes(charCode)) {
        encodedStr += String.fromCharCode(charCode);
      } else {
        encodedStr += "%" + charCode.toString(16).padStart(2, "0");
      }
    });

    return encodedStr;
  }

  private range(start: number, end: number): number[] {
    const n = end - start + 1;
    return Array.from(new Array(n), (_, i) => i + start);
  }
}
