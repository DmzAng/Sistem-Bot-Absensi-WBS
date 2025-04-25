const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fetch = require('node-fetch');
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("canvas");

const PDF_DIR = path.join(__dirname, '../pdfs');
const IMAGE_DIR = path.join(__dirname, '../images');

module.exports = {
  ensureDirectories: () => {
    [PDF_DIR, IMAGE_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  },

  downloadPDF: async (url, filename) => {
    const outputPath = path.join(PDF_DIR, filename);
    const response = await fetch(url);
    const fileStream = fs.createWriteStream(outputPath);
    await promisify(require('stream').pipeline)(response.body, fileStream);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return outputPath;
  },

  convertPDFToImages: async (pdfPath) => {
    const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const imagePaths = [];
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imagePath = path.join(IMAGE_DIR, `page_${i}.png`);
      const out = fs.createWriteStream(imagePath);
      canvas.createPNGStream().pipe(out);
      await new Promise(resolve => out.on("finish", resolve));
      imagePaths.push(imagePath);
    }
    
    return imagePaths;
  }
};