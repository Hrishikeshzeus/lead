import * as zlib from "zlib";

export interface ExtractedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    charCount: number;
    wordCount: number;
  };
}

export interface TextChunk {
  chunkIndex: number;
  title: string;
  content: string;
  tokenCount: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export class SafeDocumentParser {
  /**
   * Validate file size and mime/extension
   */
  public static validateFile(
    fileName: string,
    fileSize: number,
    mimeType?: string
  ): { valid: boolean; error?: string } {
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds maximum permitted limit of 10MB (file was ${(fileSize / (1024 * 1024)).toFixed(2)}MB).`,
      };
    }

    const ext = fileName.toLowerCase().split(".").pop();
    const allowedExtensions = ["pdf", "docx", "txt", "md", "markdown"];

    if (!ext || !allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file type: ".${ext}". Supported formats are PDF, DOCX, TXT, and Markdown.`,
      };
    }

    return { valid: true };
  }

  /**
   * Safely extract text from buffer based on file extension
   */
  public static async extractText(
    buffer: Buffer,
    fileName: string
  ): Promise<ExtractedDocument> {
    const ext = fileName.toLowerCase().split(".").pop();

    let extracted = "";

    switch (ext) {
      case "txt":
      case "md":
      case "markdown":
        extracted = buffer.toString("utf-8");
        break;

      case "docx":
        extracted = this.extractFromDocx(buffer);
        break;

      case "pdf":
        extracted = this.extractFromPdf(buffer);
        break;

      default:
        throw new Error(`Unsupported document extension: .${ext}`);
    }

    // Clean and normalize extracted text
    const cleanText = extracted
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control characters
      .trim();

    const words = cleanText.length > 0 ? cleanText.split(/\s+/).length : 0;

    return {
      text: cleanText,
      metadata: {
        charCount: cleanText.length,
        wordCount: words,
      },
    };
  }

  /**
   * Safe extraction of Word .docx (decompress PKZip and parse word/document.xml)
   */
  private static extractFromDocx(buffer: Buffer): string {
    try {
      // Find 'word/document.xml' in zip archive
      const docXmlBuffer = this.readZipEntry(buffer, "word/document.xml");
      if (!docXmlBuffer) {
        throw new Error("Could not find word/document.xml inside DOCX container.");
      }

      const xmlString = docXmlBuffer.toString("utf-8");

      // Replace paragraph closures with newlines and extract all text inside <w:t> tags
      const textPieces: string[] = [];
      const paragraphMatches = xmlString.split(/<\/w:p>/);

      for (const p of paragraphMatches) {
        const textNodes = p.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g);
        if (textNodes) {
          const paragraphText = textNodes
            .map((node) => node.replace(/<[^>]+>/g, ""))
            .join("");
          if (paragraphText.trim()) {
            textPieces.push(paragraphText.trim());
          }
        }
      }

      if (textPieces.length === 0) {
        // Fallback: strip all tags from xml
        return xmlString.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      }

      return textPieces.join("\n\n");
    } catch (err: any) {
      console.warn("[SafeDocumentParser.extractFromDocx] DOCX extraction error:", err.message);
      // Fallback: search for readable text strings
      return buffer.toString("utf-8").replace(/[^\x20-\x7E\n]/g, " ");
    }
  }

  /**
   * Safe extraction of PDF text (parse text streams & operators)
   */
  private static extractFromPdf(buffer: Buffer): string {
    try {
      const textChunks: string[] = [];
      const pdfString = buffer.toString("binary");

      // Locate stream ... endstream blocks
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match: RegExpExecArray | null;

      while ((match = streamRegex.exec(pdfString)) !== null) {
        const streamData = match[1];
        const streamBuffer = Buffer.from(streamData, "binary");

        let decompressedText = "";
        try {
          // Attempt Flate decompression
          const inflated = zlib.inflateSync(streamBuffer);
          decompressedText = inflated.toString("utf-8");
        } catch {
          // If not inflated or raw stream, inspect uncompressed
          decompressedText = streamData;
        }

        // Extract text between BT and ET operators
        const btEtRegex = /BT[\s\S]*?ET/g;
        let textBlock: RegExpExecArray | null;

        while ((textBlock = btEtRegex.exec(decompressedText)) !== null) {
          const block = textBlock[0];

          // Match strings in parentheses e.g. (Hello World) Tj
          const tjMatches = block.match(/\((.*?)\)\s*Tj/g);
          if (tjMatches) {
            for (const item of tjMatches) {
              const str = item.replace(/^\(/, "").replace(/\)\s*Tj$/, "");
              if (str.trim()) textChunks.push(str);
            }
          }

          // Match array TJ operators e.g. [(Hello) -10 (World)] TJ
          const arrayTjMatches = block.match(/\[([\s\S]*?)\]\s*TJ/g);
          if (arrayTjMatches) {
            for (const item of arrayTjMatches) {
              const innerStrings = item.match(/\((.*?)\)/g);
              if (innerStrings) {
                const combined = innerStrings
                  .map((s) => s.slice(1, -1))
                  .join("");
                if (combined.trim()) textChunks.push(combined);
              }
            }
          }
        }
      }

      if (textChunks.length === 0) {
        // Fallback: extract plain ascii words from the PDF binary
        const asciiMatches = pdfString.match(/[\x20-\x7E]{4,}/g);
        if (asciiMatches) {
          const filtered = asciiMatches.filter(
            (s) =>
              !s.startsWith("stream") &&
              !s.startsWith("xref") &&
              !s.includes("/Type") &&
              !s.includes("/Font")
          );
          return filtered.join(" ");
        }
        return "Document parsed successfully (no plain text streams detected).";
      }

      return textChunks.join(" ");
    } catch (err: any) {
      console.warn("[SafeDocumentParser.extractFromPdf] PDF extraction error:", err.message);
      return "Document uploaded. Preview text not available for this binary format.";
    }
  }

  /**
   * Helper to locate and extract a single file entry from a ZIP buffer
   */
  private static readZipEntry(zipBuffer: Buffer, targetEntryName: string): Buffer | null {
    let offset = 0;
    while (offset < zipBuffer.length - 30) {
      // Check for local file header signature 0x04034b50
      if (zipBuffer.readUInt32LE(offset) !== 0x04034b50) {
        offset++;
        continue;
      }

      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuffer.readUInt16LE(offset + 28);

      const fileName = zipBuffer.toString(
        "utf-8",
        offset + 30,
        offset + 30 + fileNameLength
      );

      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

      if (fileName === targetEntryName) {
        const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);
        if (compressionMethod === 8) {
          // Deflate compressed
          return zlib.inflateRawSync(compressedData);
        } else if (compressionMethod === 0) {
          // Uncompressed
          return compressedData;
        } else {
          return null;
        }
      }

      offset = dataOffset + compressedSize;
    }
    return null;
  }

  /**
   * Chunk text into searchable segments for RAG
   */
  public static chunkText(
    fullText: string,
    documentTitle: string,
    options: { maxChunkLength?: number; overlap?: number } = {}
  ): TextChunk[] {
    const maxLen = options.maxChunkLength || 650;
    const overlap = options.overlap || 100;

    const clean = fullText.trim();
    if (!clean) return [];

    // Split on double newlines (paragraphs) or single newlines
    const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const chunks: TextChunk[] = [];
    let currentChunkText = "";
    let chunkIndex = 0;

    for (const p of paragraphs) {
      if ((currentChunkText + " " + p).length <= maxLen) {
        currentChunkText = currentChunkText ? currentChunkText + "\n\n" + p : p;
      } else {
        if (currentChunkText) {
          chunks.push({
            chunkIndex,
            title: `${documentTitle} (Part ${chunkIndex + 1})`,
            content: currentChunkText.trim(),
            tokenCount: Math.ceil(currentChunkText.length / 4),
          });
          chunkIndex++;

          // Keep overlap from end of previous chunk
          const tail = currentChunkText.slice(-overlap);
          currentChunkText = tail + "\n\n" + p;
        } else {
          // Paragraph itself is larger than maxLen: slice it
          let start = 0;
          while (start < p.length) {
            const slice = p.slice(start, start + maxLen);
            chunks.push({
              chunkIndex,
              title: `${documentTitle} (Part ${chunkIndex + 1})`,
              content: slice.trim(),
              tokenCount: Math.ceil(slice.length / 4),
            });
            chunkIndex++;
            start += maxLen - overlap;
          }
          currentChunkText = "";
        }
      }
    }

    if (currentChunkText.trim()) {
      chunks.push({
        chunkIndex,
        title: `${documentTitle} (Part ${chunkIndex + 1})`,
        content: currentChunkText.trim(),
        tokenCount: Math.ceil(currentChunkText.length / 4),
      });
    }

    return chunks;
  }
}
