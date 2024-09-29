import Tesseract from 'tesseract.js';
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

        const receiptRows = {}; // Dictionary to store extracted rows
        let temp_arr = []; // Temporary array to store text in the current row
        let last_transform_height = 0; // Store the height of the last text item
        let key_index = 0; // Key index for each row

        // Loop through each text item on the page
        for (let i = 0; i < textContent.items.length; i++) {
          const item = textContent.items[i];
          const current_transform_height = item.transform[5]; // Height (y-position) of the current item

          // If the height changes, create a new row
          if (current_transform_height !== last_transform_height) {
            receiptRows[key_index] = temp_arr; // Save the current row to receiptRows
            last_transform_height = current_transform_height; // Update the last height
            temp_arr = []; // Reset temp array for the new row
            key_index++; // Increment the key index
          }

          temp_arr.push(item.str); // Add the text item to the current row
        }

        resolve(receiptRows); // Resolve with the receipt rows
      } catch (error) {
        reject(error); // Reject the promise if an error occurs
      }
    };

    reader.readAsArrayBuffer(file); // Read the file as an array buffer
  });
}

/**
 * Extracts text from an image using Optical Character Recognition (OCR) via Tesseract.js.
 * The image is preprocessed (converted to grayscale) before the OCR process.
 * @param {HTMLImageElement} img - The image element to process.
 * @param {string} [language='deu'] - The language to use for OCR (default is German).
 * @returns {Promise<Object>} - A Promise that resolves to a dictionary of receipt rows.
 */
export function extractFromImage(img, language = 'deu') {
  return new Promise((resolve, reject) => {
    const canvas = preprocessImage(img); // Preprocess the image

    // Run OCR using Tesseract on the preprocessed image
    Tesseract.recognize(canvas.toDataURL(), language)
      .then(({ data }) => {
        // Extract each line of text from the OCR result
        const rows = data.lines.map(line => line.text);

        // Convert the array of rows to a dictionary format
        const receiptDict = arrToDict(rows);
        resolve(receiptDict); // Resolve the dictionary of receipt rows
      })
      .catch((err) => {
        reject(err); // Reject the promise if an error occurs
      });
  });
}

/**
 * Preprocesses an image by converting it to grayscale.
 * The resulting grayscale image is drawn onto a canvas for further processing.
 * @param {HTMLImageElement} img - The image element to process.
 * @returns {HTMLCanvasElement} - The canvas element containing the grayscale image.
 */
function preprocessImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0);

  // Get the pixel data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert the image to grayscale by averaging the RGB values
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;        // Red
    data[i + 1] = avg;    // Green
    data[i + 2] = avg;    // Blue
  }

  // Update the canvas with the grayscale data
  ctx.putImageData(imageData, 0, 0);

  return canvas; // Return the canvas element with the grayscale image
}

/**
 * Converts an array of receipt rows into a dictionary format.
 * Each row is split into an array of words, and the rows are indexed by their position.
 * @param {Array<string>} receiptList - The list of receipt rows as strings.
 * @returns {Object} - A dictionary where the keys are row indices and the values are arrays of words.
 */
function arrToDict(receiptList) {
  // Clean up and split each row into words
  for (let i = 0; i < receiptList.length; i++) {
    // Remove all line breaks (\n) and split the string into an array of words
    receiptList[i] = receiptList[i].replace(/\n/g, "").split(" ");
  }

  // Convert the array of rows to a dictionary
  const receiptDict = {};
  for (let i = 0; i < receiptList.length; i++) {
    receiptDict[i] = receiptList[i]; // Index each row by its position
  }

  return receiptDict; // Return the dictionary of receipt rows
}
