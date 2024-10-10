/**
 * Converts an array of receipt rows into a dictionary format.
 * Each row is split into an array of words, and the rows are indexed by their position.
 * @param {Array<string>} receiptList - The list of receipt rows as strings.
 * @returns {Object} - A dictionary where the keys are row indices and the values are arrays of words.
 */
export function arrToDict(receiptList) {
    // Clean up and split each row into words
    for (let i = 0; i < receiptList.length; i++) {
      // Remove all line breaks (\n)
      receiptList[i] = receiptList[i].replace(/\n/g, "");
      // Replace everey "]"
      receiptList[i] = receiptList[i].replace("]", "l");
      // Replace everey ")"
      receiptList[i] = receiptList[i].replace(")", "l");
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
  

  /**
 * Extracts rows from the given text content based on the y-position (height) of each text item.
 * @param {Object} textContent - The object containing text items with position data.
 * @returns {Object} - A dictionary of extracted rows, where each key represents a row index.
 */
export function extractReceiptRows(textContent) {
    const receiptRows = {}; // Dictionary to store extracted rows
    let temp_arr = []; // Temporary array to store text in the current row
    let last_transform_height = 0; // Store the height of the last text item
    let key_index = 0; // Key index for each row

    // Loop through each text item on the page
    for (const item of textContent.items) {
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

    // Add the last row that might not be added if there's no height change at the end
    if (temp_arr.length > 0) {
        receiptRows[key_index] = temp_arr;
    }

    return receiptRows; // Return the dictionary of rows
}

  
/**
 * Helper function to convert a hex color code to an RGB object.
 * @param {string} hex - The hex color code (e.g., "#ADD8E6").
 * @returns {Object} - An object with r, g, and b properties.
 */
export function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}
  
/**
 * Checks if the RGB color is within the tolerance range of the target color.
 * @param {number} r - Red value of the pixel.
 * @param {number} g - Green value of the pixel.
 * @param {number} b - Blue value of the pixel.
 * @param {Object} targetColor - The target color object with r, g, and b properties.
 * @param {number} tolerance - The tolerance range for color matching.
 * @returns {boolean} - True if the color is within the tolerance range, otherwise false.
 */
export function isColorInRange(r, g, b, targetColor, tolerance) {
    return Math.abs(r - targetColor.r) <= tolerance &&
            Math.abs(g - targetColor.g) <= tolerance &&
            Math.abs(b - targetColor.b) <= tolerance;
}
