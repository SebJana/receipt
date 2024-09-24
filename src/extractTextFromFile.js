import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
//Copied pdf.worker.mjs to public for direct access 
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.mjs`;



/**
 * Extract text from an image using Tesseract.js
 * @param {HTMLImageElement} img - Image element to run OCR on
 * @param {String} language - Language code for Tesseract.js (e.g., 'deu' for German)
 * @return {Promise<String>} - Promise resolving to extracted text
 */
export function extractFromImage(img, language = 'deu') {
  return new Promise((resolve, reject) => {
    const canvas = preprocessImage(img);
    console.log("TEST");
    console.log(canvas);
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

export async function extractFromPDF(file) {
  if (!file) return '';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(event) {
      const pdfBytes = event.target.result;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();

        const receiptRows = {};
        let temp_arr = [];
        let last_transform_height = 0;
        let key_index = 0;
        //Items have the attribute: array transform, that has page height --> grouping by that for "rows" of receipt
        for (let i = 0; i < textContent.items.length; i++) {
          const item = textContent.items[i];
          const current_transform_height = item.transform[5];
      
          if (current_transform_height !== last_transform_height) {
              // Add a new key to the receiptRows Dict if the height changes
              receiptRows[key_index] = temp_arr;
              last_transform_height = current_transform_height;
              temp_arr = [];
              key_index++;
          }
      
          temp_arr.push(item.str);
        }
        console.log(receiptRows);
        resolve(receiptRows);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}


//Preprocesses an image by converting it to grayscale

//Further improvment is needed for good extraction by image
//Currently not useable --> Focus on PDF extraction
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
