/**
 * Cleans the receipt dictionary by removing unnecessary elements such as ' ' or ''.
 * Removes elements from the beginning and end of rows, as well as short elements (less than 3 characters).
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Cleaned receipt dictionary.
 */
export function cleanRows(receiptDict) {
    receiptDict = removeEmptyElements(receiptDict);
    receiptDict = removeUnnecessaryElementsFromEnd(receiptDict);
    receiptDict = cleanOcrErrorPatterns(receiptDict);
    
    return receiptDict;
}


/**
 * Removes ' ' and '' from the start and end of each row in the receipt dictionary.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Cleaned receipt dictionary with empty elements removed.
 */
function removeEmptyElements(receiptDict) {
    // Remove ' ' and '' from the start of each row
    for (const key in receiptDict) {
        while (receiptDict[key].length > 0 && (receiptDict[key][0] === ' ' || receiptDict[key][0] === '')) {
            receiptDict[key].splice(0, 1); // Always remove the first element if it's empty
        }
    }

    // Remove ' ' and '' from the end of each row
    for (const key in receiptDict) {
        while (receiptDict[key].length > 0 && (receiptDict[key][receiptDict[key].length - 1] === ' ' || receiptDict[key][receiptDict[key].length - 1] === '')) {
            receiptDict[key].splice(receiptDict[key].length - 1, 1); // Always remove the last element if it's empty
        }
    }

    return receiptDict;
}


/**
 * Removes elements from the end of the row if they have less than 3 characters or match specific values (e.g., 'A', 'B', 'D').
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Cleaned receipt dictionary with unnecessary elements removed.
 */
function removeUnnecessaryElementsFromEnd(receiptDict) {
    for (const key in receiptDict) {
        for (let i = receiptDict[key].length - 1; i >= 0; i--) {
            const current_element = receiptDict[key][i];
            if (receiptDict[key].length === 1) continue; // Skip single-element rows
            // Redundant check for the letters A, B, D as they are < 3 characters, but most common for tax rates at the end of receipt rows
            if (current_element === 'A' || current_element === 'B' || current_element === 'D' || current_element.length < 3) {
                receiptDict[key].splice(i, 1);
            } else {
                break; // Stop once a valid element is found
            }
        }
    }

    return receiptDict;
}


/**
 * Cleans OCR reading errors by replacing patterns like '*A', '+*A', '5A' in the receipt data.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Cleaned receipt dictionary with OCR patterns corrected.
 */
function cleanOcrErrorPatterns(receiptDict) {
    for (const key in receiptDict) {
        // Get the last element
        let lastElement = String(receiptDict[key][receiptDict[key].length - 1]);
    
        // Replace patterns like *A, *B, +*A, +*B (also replace OCR reading errors)
        lastElement = lastElement
            .replace("+*A", "")
            .replace("+*B", "")
            .replace("'A", "")
            .replace("'B", "")
            .replace("*A", "")
            .replace("*B", "")
            .replace("+A", "")
            .replace("+B", "");
    
        // Replace numbers followed by A or B (like "5A" or "10B")
        lastElement = lastElement.replace(/\d+[AB]/g, (match) => match.slice(0, -1));
    
        // Assign the modified string back to the array
        receiptDict[key][receiptDict[key].length - 1] = lastElement;
    }

    return receiptDict;
}