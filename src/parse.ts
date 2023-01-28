import fs from 'fs/promises';

type List = (string | number | List)[];

async function parse(path: string): Promise<string | number | List> {
  const data = await fs.readFile(path)
  const str = data.toString().trim();

  return decode(str);
}

function decode(str: string): [string | number | List, string] {
  if (str[0] == 'i') {
    const [value, remainder] = decodeInt(str);
    return [value, remainder];
  } else if (str[0] == 'l') {
    const [value, remainder] = decodeList(str);
    return [value, remainder];
  } else {
    const [value, remainder] = decodeStr(str);
    return [value, remainder];
  }
}

function decodeInt(str: string): [number, string] {
  const parts = str.split('e')
  const value = parseInt(parts[0].slice(1));

  return [value, parts.slice(1).join('e')]
};

function decodeList(str: string): [List, string] {
  const list = [];
  str = str.slice(1);

  while (str[0] != 'e') {
    const [value, remainder] = decode(str);
    list.push(value);
    str = remainder;
  }

  return [list, str.slice(1)];
}

function decodeStr(str: string): [string, string] {
  const parts = str.split(':');
  const len = parts[0];
  const value = parts[1].slice(0, parseInt(len));

  return [value, parts[1].slice(parseInt(len))];
}

export default parse;
