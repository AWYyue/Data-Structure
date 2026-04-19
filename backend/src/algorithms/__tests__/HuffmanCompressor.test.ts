import { HuffmanCompressor } from '../HuffmanCompressor';

describe('HuffmanCompressor', () => {
  it('compresses and decompresses plain text correctly', () => {
    const compressor = new HuffmanCompressor();
    const input = '北京故宫的一天，红墙金瓦在阳光下特别安静。';

    const encoded = compressor.compressToString(input);
    const decoded = compressor.decompressFromString(encoded);

    expect(decoded).toBe(input);
  });

  it('supports buffer round-trip', () => {
    const compressor = new HuffmanCompressor();
    const input = '颐和园 昆明湖 佛香阁 十七孔桥';

    const buffer = compressor.compressToBuffer(input);
    const decoded = compressor.decompressFromBuffer(buffer);

    expect(decoded).toBe(input);
  });
});

