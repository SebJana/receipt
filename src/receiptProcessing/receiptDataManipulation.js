import { convertToNumber, getPossibleStarts, getPossibleEnds, getDictLength, getPossibleDiscounts, removeRowsMatchedWithValues, getMaxDictKey, doesRowContainEnd, getPossibleSpecialInfo } from "./utilities.js";

/**
 * Search the previous row to the discount key, and apply the discount amount to that receiptItem
 * @param {Array} receiptDict - ReceiptItems.
 * @param {Object} receiptDict - Dictionary of discount rows.
 * @returns {Array} - ReceiptItems with discounts applied.
 */
export function applyDiscounts(receiptItems, receiptDiscount) {
    for (const key in receiptDiscount) {
        const discountValue = convertToNumber(receiptDiscount[key]); // Get the discount amount
        const discountIndex = convertToNumber(key); // Parse the key as an index

        let possible_item = null;

        // Loop through the receipt items to find the item with the highest index that is less than the discount index
        for (const element of receiptItems) {
            if (element.index < discountIndex) {
                if (!possible_item || element.index > possible_item.index) {
                    possible_item = element;
                }
            }
        }

        // Apply the discount to the found item
        if (possible_item) {
            possible_item.applyDiscount(discountValue);
        }
    }
    return receiptItems;
}

/**
 * Removes irrelevant rows from the receipt (e.g., headers, footers).
 * Focuses on keeping the relevant part of the receipt (items and prices).
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The cut receipt dictionary with only relevant content.
 */
export function cutReceipt(receiptDict) {
    const possible_starts = getPossibleStarts(); // Start points for relevant data
    const possible_ends = getPossibleEnds(); // End points for relevant data

    let tempDict = { ...receiptDict };

    // Helper function to find the start or end index
    function getEditIndex(arrToSearch) {
        for (const key in tempDict) {
            for (const element of tempDict[key]) {
                if (!/^[a-zA-Z]+$/.test(element)) {
                    continue; // Skip if the element is not only letters
                              // Can't be a start if it includes numbers (especially relevant for Kaufland App receipt pdf exports)
                }
                for (const item of arrToSearch) {
                    if (element.includes(item)) {
                        return Number(key); // Return the first occurrence
                    }
                }
            }
        }
        // Default to -1 if no match is found
        return -1;
    }

    const start_index = getEditIndex(possible_starts); // Get starting index
    let end_index = getEditIndex(possible_ends); // Get ending index

    // If an end index is found, remove rows after the relevant content
    if (end_index !== -1) {
        end_index++; // Include the "Summe" row
        const iter_length = getDictLength(tempDict) - 1;
        for (let j = end_index; j <= iter_length; j++) {
            delete tempDict[j];
        }
    }

    // If a start index is found, remove rows before the relevant content
    if (start_index !== -1) {
        for (let i = 0; i <= start_index; i++) {
            delete tempDict[i];
        }
    }

    return tempDict;
}

/**
 * Removes rows containing price per kilogram (e.g., "/kg").
 * These rows typically represent unit prices and not total prices.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The cleaned receipt dictionary with /kg rows removed.
 */
export function removeKgPriceRows(receiptDict) {
    const remove_keys = [];
    let tempDict = { ...receiptDict };

    // Find rows that contain "/kg"
    for (const key in tempDict) {
        for (const element of tempDict[key]) {
            if (element.includes("/kg")) {
                remove_keys.push(key);
            }
        }
    }

    // Remove rows that were marked for deletion
    for (const element of remove_keys) {
        delete tempDict[element];
    }

    return tempDict;
}

/**
 * Removes discount-related rows from the receipt (e.g., "Rabatt").
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The receipt dictionary with discount rows removed.
 */
export function removeDiscountRows(receiptDict) {
    const possible_discounts = getPossibleDiscounts();
    let tempDict = { ...receiptDict };

    // Remove rows that contain any of the possible discount terms
    const cleaned_dict = removeRowsMatchedWithValues(tempDict, possible_discounts);

    return cleaned_dict
}


/**
 * Removes rows containing special info (e.g. additional info) from the receipt.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt data focusing only on item rows.
 * @returns {Object} - A new dictionary with rows containing special info removed.
 */
export function removeSpecialInfoRows(receiptDict){
    const possible_special_info = getPossibleSpecialInfo();
    let tempDict = { ...receiptDict };

    // Remove rows that contain any of the possible special info terms
    const cleaned_dict = removeRowsMatchedWithValues(tempDict, possible_special_info);

    return cleaned_dict

}


/**
 * Removes the row containing the a possible receipt end (e.g. "Summe") from the receipt, which usually is the last row.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - A new dictionary with the row removed or unchanged dict if the end couldn'nt be located.
 */
export function removeSummeRow(receiptDict) {
    let tempDict = { ...receiptDict };
    const index = getMaxDictKey(tempDict); // Get the key with the highest value (last row)
    if (index === 0) {
        return null; // If no rows exist, return null --> there is no receipt to process, redundant check, because error is already thrown in the main function if the receiptDict is empty or null
    }

    const last_row_arr = tempDict[index]; // Get the last row based on the index
    if (doesRowContainEnd(last_row_arr)) { // Check if the row contains the "Summe" keyword
        delete tempDict[index]; // Delete the row if it contains the end keyword
    }

    return tempDict; // Return the updated dictionary without the "Summe" row
}