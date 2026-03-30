export interface LZ77Token {
  offset: number;
  length: number;
  nextChar: string;
}

export class LZ77Compressor {
  private readonly windowSize: number;
  private readonly lookaheadSize: number;

  constructor(windowSize: number = 255, lookaheadSize: number = 32) {
    this.windowSize = Math.max(16, windowSize);
    this.lookaheadSize = Math.max(8, lookaheadSize);
  }

  compress(input: string): LZ77Token[] {
    if (!input) return [];

    const tokens: LZ77Token[] = [];
    let cursor = 0;
    while (cursor < input.length) {
      const searchStart = Math.max(0, cursor - this.windowSize);
      const searchBuffer = input.slice(searchStart, cursor);
      const lookaheadBuffer = input.slice(cursor, cursor + this.lookaheadSize);

      let bestOffset = 0;
      let bestLength = 0;

      for (let length = 1; length <= lookaheadBuffer.length; length += 1) {
        const candidate = lookaheadBuffer.slice(0, length);
        const index = searchBuffer.lastIndexOf(candidate);
        if (index === -1) break;
        bestLength = length;
        bestOffset = searchBuffer.length - index;
      }

      const nextChar = cursor + bestLength < input.length ? input[cursor + bestLength] : '';
      tokens.push({ offset: bestOffset, length: bestLength, nextChar });
      cursor += bestLength + (nextChar ? 1 : 0);
      if (bestLength === 0 && !nextChar) {
        cursor += 1;
      }
    }
    return tokens;
  }

  decompress(tokens: LZ77Token[]): string {
    if (!tokens.length) return '';

    let out = '';
    for (const token of tokens) {
      if (token.offset > 0 && token.length > 0) {
        const start = out.length - token.offset;
        for (let i = 0; i < token.length; i += 1) {
          out += out[start + i] ?? '';
        }
      }
      if (token.nextChar) out += token.nextChar;
    }
    return out;
  }
}

