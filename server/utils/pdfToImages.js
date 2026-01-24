// Utility to convert PDF buffer to array of image buffers (one per page)
// Uses sharp for conversion (requires poppler-utils installed on system for best results)

const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

/**
 * Converts a PDF buffer to an array of PNG image buffers (one per page)
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer[]>} Array of PNG buffers
 */
async function pdfToImages(pdfBuffer) {
  // Write PDF to a temp file
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `pdf2img_${Date.now()}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  // Load PDF and get page count
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  const imageBuffers = [];

  for (let i = 0; i < pageCount; i++) {
    // sharp can read a specific page: input.pdf[0], input.pdf[1], ...
    const pagePath = `${tempPdfPath}[${i}]`;
    try {
      const imgBuffer = await sharp(pagePath)
        .png()
        .toBuffer();
      imageBuffers.push(imgBuffer);
    } catch (err) {
      // Clean up temp file and throw
      fs.unlinkSync(tempPdfPath);
      throw new Error(`Failed to convert PDF page ${i + 1} to image: ${err.message}`);
    }
  }
  fs.unlinkSync(tempPdfPath);
  return imageBuffers;
}

module.exports = pdfToImages;