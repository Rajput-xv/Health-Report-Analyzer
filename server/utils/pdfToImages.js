// Utility to convert PDF buffer to array of image buffers (one per page)
// Uses sharp for conversion (requires poppler-utils installed on system for best results)

const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

// Cap pages so a huge PDF can't blow up memory/CPU
const MAX_PDF_PAGES = 30;

/**
 * Converts a PDF buffer to an array of PNG image buffers (one per page)
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer[]>} Array of PNG buffers
 */
async function pdfToImages(pdfBuffer) {
  // Unique temp file per request so concurrent uploads don't overwrite each other
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `pdf2img_${Date.now()}_${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    if (totalPages > MAX_PDF_PAGES) {
      console.warn(`PDF has ${totalPages} pages; processing only the first ${MAX_PDF_PAGES}.`);
    }
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
        throw new Error(`Failed to convert PDF page ${i + 1} to image: ${err.message}`);
      }
    }
    return imageBuffers;
  } finally {
    // Always remove the temp file, even if something above threw
    try {
      fs.unlinkSync(tempPdfPath);
    } catch (cleanupErr) {
      if (cleanupErr.code !== 'ENOENT') {
        console.error('Failed to remove temp PDF:', cleanupErr.message);
      }
    }
  }
}

module.exports = pdfToImages;