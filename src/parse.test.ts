import { describe, expect, test } from '@jest/globals';
import parse from './parse';

describe('parse', () => {
  test('returns the contents of a file', async () => {
    const data = await parse('src/test.txt');
    expect(data).toBe('test\n');
  });
});
