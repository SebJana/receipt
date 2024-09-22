import Tesseract from 'tesseract.js';
import { GlobalWorkerOptions, version, getDocument } from 'pdfjs-dist';

/**
 * Extract text from an image using Tesseract.js
 * @param {HTMLImageElement} img - Image element to run OCR on
 * @param {String} language - Language code for Tesseract.js (e.g., 'deu' for German)
 * @return {Promise<String>} - Promise resolving to extracted text
 */
export function extractFromImage(img, language = 'deu') {
  return new Promise((resolve, reject) => {
    const canvas = preprocessImage(img);
    // Run OCR using Tesseract on the preprocessed image
    Tesseract.recognize(canvas.toDataURL(), language)
      .then(({ data: { text } }) => {
        resolve(text); // Resolve the extracted text
      })
      .catch((err) => {
        reject(err); // Reject the promise if an error occurs
      });
  });
}

/**
 * Extract text from a PDF using pdfjs-dist
 * @param {File} file - PDF file object
 * @return {Promise<String>} - Promise resolving to extracted text from the first page
 */
export function extractFromPDF(file) {
  return "TEEST";
}

/**
 * Preprocesses an image by converting it to grayscale
 * @param {HTMLImageElement} img - Image element to preprocess
 * @return {HTMLCanvasElement} - Processed canvas element
 */
function preprocessImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;

  // Convert the image to grayscale
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg; // Red
    data[i + 1] = avg; // Green
    data[i + 2] = avg; // Blue
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas; // Return the canvas element
}
