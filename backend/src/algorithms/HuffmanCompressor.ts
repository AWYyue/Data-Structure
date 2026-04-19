interface HuffmanNode {
  char?: string;
  frequency: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

interface HuffmanPayload {
  version: 1;
  originalLength: number;
  encodedBits: string;
  codes: Record<string, string>;
}

export class HuffmanCompressor {
  compress(text: string): HuffmanPayload {
    if (!text) {
      return {
        version: 1,
        originalLength: 0,
        encodedBits: '',
        codes: {},
      };
    }

    const frequencies = new Map<string, number>();
    for (const char of text) {
      frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
    }

    const root = this.buildTree(
      Array.from(frequencies.entries()).map(([char, frequency]) => ({
        char,
        frequency,
      })),
    );
    const codes: Record<string, string> = {};
    this.buildCodes(root, '', codes);

    let encodedBits = '';
    for (const char of text) {
      encodedBits += codes[char];
    }

    return {
      version: 1,
      originalLength: text.length,
      encodedBits,
      codes,
    };
  }

  decompress(payload: HuffmanPayload): string {
    if (!payload?.encodedBits || !payload.codes || payload.originalLength === 0) {
      return '';
    }

    const reverseCodes = new Map<string, string>();
    Object.entries(payload.codes).forEach(([char, code]) => {
      reverseCodes.set(code, char);
    });

    let cursor = '';
    let output = '';
    for (const bit of payload.encodedBits) {
      cursor += bit;
      const match = reverseCodes.get(cursor);
      if (match !== undefined) {
        output += match;
        cursor = '';
      }
    }

    return output.slice(0, payload.originalLength);
  }

  compressToString(text: string): string {
    return JSON.stringify(this.compress(text));
  }

  decompressFromString(encoded: string): string {
    if (!encoded) {
      return '';
    }

    try {
      const payload = JSON.parse(encoded) as HuffmanPayload;
      if (!payload || payload.version !== 1) {
        return '';
      }
      return this.decompress(payload);
    } catch {
      return '';
    }
  }

  compressToBuffer(text: string): Buffer {
    return Buffer.from(this.compressToString(text), 'utf8');
  }

  decompressFromBuffer(buffer: Buffer | null | undefined): string {
    if (!buffer || buffer.length === 0) {
      return '';
    }
    return this.decompressFromString(buffer.toString('utf8'));
  }

  private buildTree(nodes: HuffmanNode[]): HuffmanNode {
    if (!nodes.length) {
      return { frequency: 0 };
    }

    if (nodes.length === 1) {
      return {
        frequency: nodes[0].frequency,
        left: nodes[0],
      };
    }

    const queue = [...nodes].sort((a, b) => a.frequency - b.frequency);
    while (queue.length > 1) {
      const left = queue.shift()!;
      const right = queue.shift()!;
      const parent: HuffmanNode = {
        frequency: left.frequency + right.frequency,
        left,
        right,
      };
      queue.push(parent);
      queue.sort((a, b) => a.frequency - b.frequency);
    }

    return queue[0];
  }

  private buildCodes(node: HuffmanNode | undefined, prefix: string, codes: Record<string, string>): void {
    if (!node) {
      return;
    }

    if (node.char !== undefined) {
      codes[node.char] = prefix || '0';
      return;
    }

    this.buildCodes(node.left, `${prefix}0`, codes);
    this.buildCodes(node.right, `${prefix}1`, codes);
  }
}

