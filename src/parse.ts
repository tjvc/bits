import fs from 'fs/promises';

async function parse(path: string): Promise<string> {
  const data = await fs.readFile(path);
  return data.toString();
}

export default parse;
