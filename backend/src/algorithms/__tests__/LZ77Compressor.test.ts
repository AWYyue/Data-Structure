import { LZ77Compressor } from '../LZ77Compressor';

describe('LZ77Compressor', () => {
  it('round-trips mixed language text', () => {
    const compressor = new LZ77Compressor();
    const input = '北京北京北京 museum museum 旅行日记 123123123';
    const tokens = compressor.compress(input);
    const output = compressor.decompress(tokens, input.length);
    expect(output).toBe(input);
  });

  it('supports buffer encode/decode', () => {
    const compressor = new LZ77Compressor();
    const input = '风景很好，适合拍照和骑行。';
    const buffer = compressor.compressToBuffer(input);
    const output = compressor.decompressFromBuffer(buffer);
    expect(output).toBe(input);
  });

  it('handles empty input safely', () => {
    const compressor = new LZ77Compressor();
    expect(compressor.compress('')).toEqual([]);
    expect(compressor.decompressFromString('')).toBe('');
    expect(compressor.decompressFromBuffer(Buffer.alloc(0))).toBe('');
  });
});
