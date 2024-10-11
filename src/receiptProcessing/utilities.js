/**
 * Removes rows from the receipt dictionary that match any values from a given list.
 * This function is general and works by looping through the receipt data and removing 
 * any rows containing specific unwanted values.
 * 
 * @param {Object} receiptDict - Dictionary of receipt data where each key is a row index, 
 *                               and each value is an array representing the contents of the row.
 * @param {Array} possibleValues - Array of strings representing the values to match and remove 
 * @returns {Object} - A new dictionary with matched rows removed.
 */
export function removeRowsMatchedWithValues(receiptDict, possibleValues) {
    let tempDict = { ...receiptDict };
    // Loop through the receipt rows
    for (const key in tempDict) {
        // Loop through the values in each row
        for (const element of tempDict[key]) {
            // Check if any of the possible values match the row's contents
            for (const value of possibleValues) {
                if (element.includes(value)) {
                    delete tempDict[key]; // Remove the entire row (key) if a match is found
                    break; // Break out of the loop once a match is found
                }
            }
            if (!tempDict.hasOwnProperty(key)) break; // Exit loop if row was deleted
        }
    }
    return tempDict; // Return the updated dictionary with rows removed
}

/**
 * Returns a dictionary of possible store names and their corresponding identifiers.
 * @returns {Object} - Dictionary of store names and their associated keywords.
 */
export function getPossibleStores() {
    return {
        "Kaufland": ["Kaufland", "KAUFLAND", "KLC", "Bergsteig", "09621/78260"],
        "Lidl": ["Lidl", "LIDL", "Barbarastr", "Hirschauer", "L4DL", "L$DE", "Lid)", "Li1dl", "Lıdl"],
        "Netto": ["Netto", "NETTO", "Mosacher", "Deutschlandcard", "Marken-Discount"],
        "Edeka": ["Edeka", "EDEKA", "Wiesmeth", "Pfistermeisterstr", "G&G", "Kuhnert"],
        "Aldi": ["Aldi", "ALDI"],
        "Norma": ["Norma", "NORMA"]
    };
}

/**
 * Returns an array of all the store names (keys) available in the possible stores dictionary.
 * These store names are used to match against the receipt data to identify which store the receipt belongs to.
 * @returns {Array} - An array of store names (e.g., "Kaufland", "Lidl", etc.).
 */
export function getPossibleStoreKeys() {
    const possible_stores = getPossibleStores(); // Retrieve the dictionary of possible stores
    const possible_store_keys = [];

    // Loop through the possible stores object and extract each store key
    for (const key in possible_stores) {
        possible_store_keys.push(key); // Add each store key (name) to the array
    }

    return possible_store_keys; // Return the array of store keys
}

/**
 * Returns a list of possible receipt start indicators (e.g., "EUR", "Preis EUR").
 * These help identify where the relevant receipt content begins.
 * @returns {Array} - Array of possible receipt start strings.
 */
export function getPossibleStarts() {
    return ["EUR", "Preis EUR", "PREIS", "Preis"];
}

/**
 * Returns a list of possible receipt end indicators (e.g., "SUMME", "zu zahlen").
 * These help identify where the relevant receipt content ends.
 * @returns {Array} - Array of possible receipt end strings.
 */
export function getPossibleEnds() {
    return ["SUMME", "Summe", "zu zahlen", "Zu Zahlen", "Zahlen", "zahlen", "zahlen.", "SUNNE"];
}

/**
 * Returns a list of possible discount-related keywords (e.g., "Rabatt", "Extrapunkte").
 * These help identify rows in the receipt that indicate discounts.
 * @returns {Array} - Array of possible discount keywords.
 */
export function getPossibleDiscounts() {
    return ["Rabatt", "RABATT", "Rebatt", "Wıllkommensrabatt", "Willkommensrabatt"];
}

/**
 * Returns a list of possible special-info keywords (e.g., "Zusatzpunkte").
 * These help identify rows in the receipt that loyalty points.
 * @returns {Array} - Array of possible special info keywords.
 */
export function getPossibleSpecialInfo() {
    return ["Zusatzpunkte", "sparen", "Posten:"];
}


/**
 * Returns a list of possible store specific name prefixes (e.g., "KLC.", "G&G_").
 * These help identify and remove store-specific parts from the item names.
 * @returns {Array} - Array of possible store-specific name prefixes.
 */
export function getPossibleStoreSpecificNamePrefixes(){
    // Add store-specific name prefixes here
    // Order of Items is **RELEVANT** because of the order of the replace function
    return ["KLC.", "KLC ", "KLC", "G&G_", "G&G"];
}

/**
 * Gets the number of keys in the dictionary (i.e., the number of rows in the receipt).
 * @param {Object} dict - The dictionary to count keys from.
 * @returns {number} - The number of keys in the dictionary.
 */
export function getDictLength(dict) {
    return Object.keys(dict).length;
}

/**
 * Converts a value to a number, handling special cases like comma instead of a decimal point.
 * Rounds the result to two decimal places.
 * @param {string} value - The value to convert to a number.
 * @returns {number|null} - The converted number, or null if conversion fails.
 */
export function convertToNumber(value) {
    let normalizedValue = value.replace(',', '.'); // Replace commas with decimal points
    let num = Number(normalizedValue);

    return !isNaN(num) ? parseFloat(num.toFixed(2)) : null; // Round to 2 decimal places if valid number
}


/**
 * Replaces elements in a string from an array of possible values.
 * @param {string} str - The string to replace the elements from.
 * @param {Array} - Array of possible contents of the string to replace.	
 * @returns {string} str- The edited string.
 */
export function replaceFromLookupArray(str, array){
    // Lopp through the array and replace each element
    for (const item of array) {
        str = str.replace(item, "");
    }
    return str;
}

/**
 * Checks if a row contains any possible end indicators (e.g., "SUMME", "zu zahlen").
 * This helps identify the total sum row in the receipt.
 * @param {Array} row - The row to check for end indicators.
 * @returns {boolean} - True if the row contains an end indicator, false otherwise.
 */
export function doesRowContainEnd(row) {
    const possible_ends = getPossibleEnds();
    for (const end of possible_ends) {
        for (const str of row) {
            if (str.includes(end)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Gets the highest numeric key in the dictionary, assuming the keys are numbers.
 * @param {Object} dict - The dictionary from which to find the highest key.
 * @returns {number} - The highest numeric key, or 0 if no keys are found or if no valid numeric keys exist.
 */
export function getMaxDictKey(dict) {
    if (!dict || getDictLength(dict) === 0) {
        return 0;
    }

    const numericKeys = Object.keys(dict)
        .map(key => Number(key))
        .filter(key => !isNaN(key)); // Filter out NaN values

    // If there are no valid numeric keys, return 0
    if (numericKeys.length === 0) {
        return 0;
    }

    // Find the largest numeric key
    return numericKeys.reduce((a, b) => Math.max(a, b), -Infinity);
}

/**
 * Concatenates item name from the row by excluding empty spaces.
 * @param {Array} row - Array of strings representing a row of the receipt.
 * @param {number} last_index - Index of the last element in the row.
 * @returns {string} - The concatenated item name.
 */
export function concatenatItemNameString(row, elems_to_leave_out) {
    if (row.length === 0) return '';
    if (row.length === 1) return row[0];

    let name_str = '';
    // Delete all whitespaces from name so that both pdf and img input is equal
    const cleanRow = row.filter(item => item !== ' ');

    // Declare loop stop as (length - elements) set to leave at the row end
    let last_index = cleanRow.length;
    last_index = last_index - elems_to_leave_out;

    for (let i = 0; i < last_index; i++) {
        name_str = name_str + cleanRow[i] + ' ';
    }

    return name_str.trim();
}