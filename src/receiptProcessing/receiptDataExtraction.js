import { getPossibleDiscounts, getMaxDictKey, getPossibleStores, convertToNumber, doesRowContainEnd } from "./utilities.js";

/**
 * Extracts the discount containing rows and saves the amount corresponding to the row key
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Discount Rows.
 */
export function extractDiscountRows(receiptDict) {
    const possible_discounts = getPossibleDiscounts();
    const discount_rows = {};

    // Loop through the receipt to find and remove discount rows
    for (const key in receiptDict) {
        const last_index = receiptDict[key].length -1;
        for (const element of receiptDict[key]) {
            for (const discount of possible_discounts) {
                if (element.includes(discount)) {
                    discount_rows[key] = receiptDict[key][last_index]; // Add the correct amount of the discount row
                    break; // Break out of the `j` loop
                }
            }
            if (discount_rows[key]) {
                break; // Break out of the `i` loop if discount was found
            }
        }
    }

    return discount_rows;
}

/**
 * Extracts the store name from the receipt.
 * Matches store identifiers against a list of possible stores.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {string} - The store name if found, otherwise default to 'Kaufland'.
 */
export function extractStore(receiptDict) {
    const possible_stores = getPossibleStores();

    // Loop through all rows of the receipt
    for (const key in receiptDict) {
        // Loop through every word in the row
        for (const element of receiptDict[key]) {
            // Loop through every possible store
            for (const store in possible_stores) {
                // Loop through every possible store identifier
                for (const identifier of possible_stores[store]) {
                    if (element.includes(identifier)) {
                        return store; // Return store if found
                    }
                }
            }
        }
    }

    // Default store if no match is found (User has to confirm)
    return "Kaufland";
}

/**
 * Extracts the date from the receipt.
 * Searches for date patterns (DD.MM.YY or DD.MM.YYYY) in the receipt.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {string} - The extracted date in YYYY-MM-DD format, or the current date if none found.
 */
export function extractDate(receiptDict) {
    // Date pattern: DD.MM.YY or DD.MM.YYYY
    const datePattern = /\b(\d{2})[.\-/](\d{2})[.\-/](\d{2}|\d{4})\b/;

    for (const key in receiptDict) {
        // Loop through every word in the row
        for (const element of receiptDict[key]) {
            // Check if datePattern appears somewhere in the string
            const date_text = element.match(datePattern);
            if (date_text) {
                // Extract the day, month, and year from the regex match
                const day = date_text[1];
                const month = date_text[2];
                let year = date_text[3];

                // If the year is in YY format, convert it to YYYY
                if (year.length === 2) {
                    const currentYear = new Date().getFullYear().toString();
                    const century = currentYear.substring(0, 2); // Get the current century (first two digits of the year)
                    year = `${century}${year}`;
                }

                // Format the extracted date as YYYY-MM-DD
                return `${year}-${month}-${day}`;
            }
        }
    }

    // If no date is found, return the current date in YYYY-MM-DD format
    const current_date = new Date();
    const formatted_date = current_date.toISOString().split('T')[0];

    return formatted_date;
}

/**
 * Extracts the sum (total amount) from the receipt.
 * Typically found at the bottom of the receipt.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {number|null} - The extracted sum, or null if no sum is found.
 */
export function extractSum(receiptDict) {
    const index = getMaxDictKey(receiptDict); // Get the index of the last row

    if (index === 0) {
        return null; // Return null if no valid row is found
    }

    const last_row_arr = receiptDict[index];

    // Check if the last row contains a possible end (e.g., "Summe")
    if (doesRowContainEnd(last_row_arr)) {
        const last_row_elem = last_row_arr[last_row_arr.length - 1];
        const last_row_num = convertToNumber(last_row_elem); // Convert last element to a number

        if (!isNaN(last_row_num)) {
            return last_row_num; // Return the sum if valid
        }
    }

    return null; // Default to null if no sum can be determined
}