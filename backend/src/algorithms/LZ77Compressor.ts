export interface LZ77Token {
  offset: number;
  length: number;
  nextChar: string;
}

interface EncodedPayload {
  version: 1;
  length: number;
  tokens: LZ77Token[];
}

/**
 * 简化版 LZ77：输出 <offset, length, nextChar> 三元组，适合文本压缩存储。
 */
export class LZ77Compressor {
  private readonly windowSize: number;
  private readonly lookaheadSize: number;

  constructor(windowSize: number = 255, lookaheadSize: number = 32) {
    this.windowSize = Math.max(16, windowSize);
    this.lookaheadSize = Math.max(8, lookaheadSize);
  }

  compress(input: string): LZ77Token[] {
    if (!input) {
      return [];
    }

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
        if (index === -1) {
          break;
        }
        bestLength = length;
        bestOffset = searchBuffer.length - index;
      }

      const nextChar = cursor + bestLength < input.length ? input[cursor + bestLength] : '';
      tokens.push({
        offset: bestOffset,
        length: bestLength,
        nextChar,
      });

      cursor += bestLength + (nextChar ? 1 : 0);
      if (bestLength === 0 && !nextChar) {
        cursor += 1;
      }
    }

    return tokens;
  }

  decompress(tokens: LZ77Token[], expectedLength?: number): string {
    if (!tokens.length) {
      return '';
    }

    let output = '';
    for (const token of tokens) {
      if (token.offset > 0 && token.length > 0) {
        const start = output.length - token.offset;
        for (let i = 0; i < token.length; i += 1) {
          output += output[start + i] ?? '';
        }
      }
      if (token.nextChar) {
        output += token.nextChar;
      }
    }

    if (typeof expectedLength === 'number' && expectedLength >= 0) {
      return output.slice(0, expectedLength);
    }
    return output;
  }

  compressToString(input: string): string {
    const payload: EncodedPayload = {
      version: 1,
      length: input.length,
      tokens: this.compress(input),
    };
    return JSON.stringify(payload);
  }

  decompressFromString(encoded: string): string {
    if (!encoded) {
      return '';
    }
    try {
      const payload = JSON.parse(encoded) as EncodedPayload;
      if (!payload || payload.version !== 1 || !Array.isArray(payload.tokens)) {
        return '';
      }
      return this.decompress(payload.tokens, payload.length);
    } catch {
      return '';
    }
  }

  compressToBuffer(input: string): Buffer {
    return Buffer.from(this.compressToString(input), 'utf8');
  }

  decompressFromBuffer(buffer: Buffer | null | undefined): string {
    if (!buffer || buffer.length === 0) {
      return '';
    }
    return this.decompressFromString(buffer.toString('utf8'));
  }
}

