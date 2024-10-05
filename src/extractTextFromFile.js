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
  // Create a canvas and draw the original image on it
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);


  // Step 1: Apply Gaussian Blur to reduce noise
  applyGaussianBlur(ctx, canvas.width, canvas.height, 1);

  // Step 2: Convert the image to greyscale
  convertToGrayscale(canvas, ctx);

  // Step 3: Enhance the contrast
  // TODO: Dynamic enhancement factor based on pic (range: 1,3 - 2)?
  enhanceContrast(canvas, ctx);

  // Values ranging from 4.5 - 5.5 maybe, higher value --> less enhancement?
  console.log(calculateAverageContrast(canvas, ctx));


  autoDownloadCanvas(canvas, 'final-image.png');

  return canvas; // Return the preprocessed canvas
}

/**
 * Automatically triggers the download of the image from the canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element containing the image to download.
 * @param {string} filename - The name of the file to be saved as.
 */
function autoDownloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/**
 * Apply contrast enhancement to an image by stretching the intensity levels and applying a contrast factor.
 * @param {HTMLCanvasElement} canvas - The canvas element containing the image.
 * @param {CanvasRenderingContext2D} ctx - The 2D context of the canvas.
 * @param {number} lowPercentile - The lower percentile for contrast stretching (e.g., 5).
 * @param {number} highPercentile - The upper percentile for contrast stretching (e.g., 95).
 * @param {number} contrastFactor - The factor by which to increase the contrast (e.g., 1.2 for 20% more contrast).
 */
function enhanceContrast(canvas, ctx, lowPercentile = 1, highPercentile = 99, contrastFactor = 1.7) {
  // Get the image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Step 1: Find the minimum and maximum pixel intensities at the given percentiles
  const grayscaleValues = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // Red, Green, and Blue values are the same in grayscale
    grayscaleValues.push(gray);
  }

  // Sort grayscale values
  grayscaleValues.sort((a, b) => a - b);

  const lowIndex = Math.floor((lowPercentile / 100) * grayscaleValues.length);
  const highIndex = Math.floor((highPercentile / 100) * grayscaleValues.length);

  const minValue = grayscaleValues[lowIndex]; // Lower bound intensity
  const maxValue = grayscaleValues[highIndex]; // Upper bound intensity

  // Step 2: Apply contrast stretching to each pixel and apply the contrast factor
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];

    // Apply contrast enhancement formula
    let enhancedGray = ((gray - minValue) / (maxValue - minValue)) * 255;

    // Apply contrast factor (center the contrast around 128)
    enhancedGray = 128 + (enhancedGray - 128) * contrastFactor;

    // Clamp the value to be between 0 and 255
    const clampedGray = Math.max(0, Math.min(255, enhancedGray));

    // Set the new intensity value back to R, G, B channels
    data[i] = data[i + 1] = data[i + 2] = clampedGray;
  }

  // Step 3: Put the enhanced image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}


/**
 * Applies a Gaussian blur to the image to reduce noise.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {number} width - The width of the canvas.
 * @param {number} height - The height of the canvas.
 * @param {number} radius - The radius of the blur (default is 1.0).
 */
function applyGaussianBlur(ctx, width, height, radius = 1.0) {
  ctx.filter = `blur(${radius}px)`; // Apply blur filter with the specified radius
  ctx.drawImage(ctx.canvas, 0, 0);  // Redraw the image with blur applied
}

/**
 * Converts an image on a canvas to grayscale.
 * @param {HTMLCanvasElement} canvas - The canvas element containing the image.
 * @param {CanvasRenderingContext2D} ctx - The 2D context of the canvas.
 */
function convertToGrayscale(canvas, ctx) {
  // Get the image data (pixels) from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data; // This is a flat array with RGBA values

  // Loop through each pixel in the image
  for (let i = 0; i < data.length; i += 4) {
    // Get the red, green, and blue values
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    // Calculate the average value to use as the grayscale value (common method)
    const grayscale = (red + green + blue) / 3;

    // Set the red, green, and blue channels to the grayscale value
    data[i] = data[i + 1] = data[i + 2] = grayscale;
    // Alpha (data[i + 3]) remains unchanged
  }

  // Put the updated pixel data back to the canvas
  ctx.putImageData(imageData, 0, 0);
}


/**
 * Calculate the average contrast of an image based on pixel intensity differences with neighbors.
 * @param {HTMLCanvasElement} canvas - The canvas element containing the image.
 * @param {CanvasRenderingContext2D} ctx - The 2D context of the canvas.
 * @returns {number} - The average contrast of the image.
 */
function calculateAverageContrast(canvas, ctx) {
  // Get the image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  let totalDifference = 0;
  let comparisonCount = 0;

  // Loop through each pixel in the image
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Get the index of the current pixel (R channel, assuming grayscale)
      const index = (y * width + x) * 4;
      const currentPixel = data[index]; // Use red channel for grayscale intensity

      // Check neighboring pixels (top, right, bottom, left)
      const neighbors = [
        getPixelValue(x, y - 1, width, height, data), // Top neighbor
        getPixelValue(x + 1, y, width, height, data), // Right neighbor
        getPixelValue(x, y + 1, width, height, data), // Bottom neighbor
        getPixelValue(x - 1, y, width, height, data)  // Left neighbor
      ];

      // Calculate the total difference between the current pixel and its neighbors
      neighbors.forEach((neighbor) => {
        if (neighbor !== null) {
          totalDifference += Math.abs(currentPixel - neighbor);
          comparisonCount++;
        }
      });
    }
  }

  // Calculate and return the average contrast
  const averageContrast = totalDifference / comparisonCount;
  return averageContrast;
}

/**
 * Helper function to get the grayscale value of a pixel at (x, y).
 * Returns null if the coordinates are out of bounds.
 * @param {number} x - The x coordinate of the pixel.
 * @param {number} y - The y coordinate of the pixel.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {Uint8ClampedArray} data - The image data array.
 * @returns {number|null} - The grayscale value of the pixel or null if out of bounds.
 */
function getPixelValue(x, y, width, height, data) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null; // Out of bounds
  }
  const index = (y * width + x) * 4;
  return data[index]; // Return the red channel as the grayscale value
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
    // Remove all line breaks (\n)
    receiptList[i] = receiptList[i].replace(/\n/g, "");
    // Replace everey "]"
    receiptList[i] = receiptList[i].replace("]", "l");
    // Split the string into an array
    receiptList[i] = receiptList[i].split(" ");
  }

  // Convert the array of rows to a dictionary
  const receiptDict = {};
  for (let i = 0; i < receiptList.length; i++) {
    receiptDict[i] = receiptList[i]; // Index each row by its position
  }

  return receiptDict; // Return the dictionary of receipt rows
}
