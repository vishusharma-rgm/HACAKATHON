const pdfParse = require("pdf-parse");

const cleanText = (value) =>
  String(value || "")
    .replace(/[\x00-\x08\x0E-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractTextFromPdf = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid PDF buffer.");
  }

  try {
    const parsed = await pdfParse(buffer);
    const parsedText = cleanText(parsed.text);

    if (parsedText) {
      return parsedText;
    }
  } catch (_error) {
    // Fallback below if PDF parsing fails on malformed or scanned files.
  }

  // Fallback: decode byte stream and clean text.
  const rawText = buffer.toString("utf-8");

  const text = cleanText(rawText);

  if (!text) {
    throw new Error("Could not extract text from PDF.");
  }

  return text;
};

module.exports = {
  extractTextFromPdf,
};
