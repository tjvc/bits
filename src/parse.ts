import fs from "fs/promises";

type List = (string | number | List | Dict)[];
type Dict = Record<string, any>;

async function parse(path: string): Promise<string | number | List | Dict> {
  const data = await fs.readFile(path);
  const str = data.toString().trim();

  return decode(str);
}

function decode(str: string): [string | number | List | Dict, string] {
  if (str[0] == "i") {
    const [value, remainder] = decodeInt(str);
    return [value, remainder];
  } else if (str[0] == "l") {
    const [value, remainder] = decodeList(str);
    return [value, remainder];
  } else if (str[0] == "d") {
    const [value, remainder] = decodeDict(str);
    return [value, remainder];
  } else {
    const [value, remainder] = decodeStr(str);
    return [value, remainder];
  }
}

function decodeInt(str: string): [number, string] {
  const parts = str.split(/e(.*)/s);
  const value = parseInt(parts[0].slice(1));

  return [value, parts[1]];
}

function decodeList(str: string): [List, string] {
  const list = [];
  str = str.slice(1);

  while (str[0] != "e") {
    const [value, remainder] = decode(str);
    list.push(value);
    str = remainder;
  }

  return [list, str.slice(1)];
}

function decodeStr(str: string): [string, string] {
  const parts = str.split(/:(.*)/s);
  const len = parts[0];
  const value = parts[1].slice(0, parseInt(len));
  const remainder = parts[1].slice(parseInt(len));

  return [value, remainder];
}

function decodeDict(str: string): [Dict, string] {
  const dict: Dict = {};
  str = str.slice(1);

  while (str[0] != "e") {
    const [key, remainder] = decodeStr(str);
    const [value, remainder2] = decode(remainder);
    dict[key] = value;
    str = remainder2;
  }

  return [dict, str.slice(1)];
}

export default parse;
