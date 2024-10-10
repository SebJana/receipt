import { arrToDict, hexToRgb, isColorInRange } from './utilities.js';
import Tesseract from 'tesseract.js';

/**
 * Extracts text from an image using Optical Character Recognition (OCR) via Tesseract.js.
 * The image is preprocessed before the OCR process.
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
          reject(new Error(err)); // Reject the promise if an error occurs
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
  
    // Replace light blue with black for Lidl Plus App Receipt (Lidl Plus Rabatt)
    replaceColorRange(canvas, ctx, "#70c0e5", 30);
  
    // Step 1: Apply Gaussian Blur to reduce noise
    applyGaussianBlur(ctx, 1);
  
    // Step 2: Convert the image to greyscale
    convertToGrayscale(canvas, ctx);
  
    // Step 3: Enhance the contrast
    // TODO: Dynamic enhancement factor based on pic (range: 1,3 - 2)?
    enhanceContrast(canvas, ctx);
  
    // autoDownloadCanvas(canvas, 'final-image.png');
  
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
 * @param {CanvasRenderingContext2D} ctx - The canvas context.nvas.
 * @param {number} radius - The radius of the blur (default is 1.0).
 */
function applyGaussianBlur(ctx, radius = 1.0) {
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
 * Replaces a specific light blue color and colors within a tolerance range with black in a canvas image.
 * @param {HTMLCanvasElement} canvas - The canvas element containing the image.
 * @param {CanvasRenderingContext2D} ctx - The 2D context of the canvas.
 * @param {string} color - The target color in hex to be replaced.
 * @param {number} tolerance - The tolerance range (0-255) for color matching. Higher values make the matching more lenient.
 */
function replaceColorRange(canvas, ctx, color, tolerance) {
    // Get the image data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert hex color to RGB
    const targetColor = hexToRgb(color);

    // Loop through every pixel in the image
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];     // Red channel
        const g = data[i + 1]; // Green channel
        const b = data[i + 2]; // Blue channel

        // Check if the pixel color is within the tolerance range of the target color
        if (isColorInRange(r, g, b, targetColor, tolerance)) {
        // Change the pixel color to black (RGB: 0, 0, 0)
        data[i] = 0;     // Red channel
        data[i + 1] = 0; // Green channel
        data[i + 2] = 0; // Blue channel
        }
    }  // Put the modified image data back onto the canvas
    ctx.putImageData(imageData, 0, 0);
}
  