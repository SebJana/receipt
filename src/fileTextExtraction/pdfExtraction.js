import { extractReceiptRows } from './utilities.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Set up the PDF.js worker for handling PDF extraction
// The worker script is located in the public directory for direct access
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;

/**
 * Extracts text from a PDF file and processes it into rows based on the page's structure.
 * This method uses PDF.js to load the PDF, then extracts the text content from the first page,
 * grouping the text into rows by using the height of the text items.
 * @param {File} file - The PDF file to process.
 * @returns {Promise<Object|null>} - A Promise that resolves to a dictionary where each key represents
 *                                   a row of the receipt, or null if no file is provided.
 */
export async function extractFromPDF(file) {
    if (!file) return null;
  
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const pdfBytes = event.target.result; // Get PDF content as bytes
        try {
          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
          const pdf = await loadingTask.promise;
  
          // Get the first page of the PDF
          const page = await pdf.getPage(1);
          const textContent = await page.getTextContent();
  
          const receiptRows = extractReceiptRows(textContent); // Extract rows from the text content
  
          resolve(receiptRows); // Resolve with the receipt rows
        } catch (error) {
          reject(new Error(error)); // Reject the promise if an error occurs
        }
      };
  
      reader.readAsArrayBuffer(file); // Read the file as an array buffer
    });
  }