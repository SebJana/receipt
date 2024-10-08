import { fuzzyMatch, getCategories } from "./categoryMatching";

/**
 * Processes the receipt dictionary and extracts relevant information.
 * Cleans the rows, identifies the store, extracts the date, 
 * cuts unnecessary parts, and processes the items and total sum.
 * @param {Object} receiptDict - The dictionary containing raw receipt data.
 * @returns {Object} - A Receipt object containing the store, date, sum, and receipt items.
 * @throws Will throw an error if the receipt text couldn't be extracted or processed.
 */
export function processReceiptDict(receiptDict) {
    //TODO Error Handling, Edge Cases

    if (!receiptDict || getDictLength(receiptDict) === 0) {
        throw new Error('Receipt text couldn’t be extracted');
    }

    // Step 1: Clean the rows by removing irrelevant data (e.g., ' ' and '' elements)
    const cleanReceiptDict = cleanRows(receiptDict);

    // Step 2: Extract the store name and date from the receipt
    const store = extractStore(cleanReceiptDict);
    const date = extractDate(cleanReceiptDict);

    // Step 3: Extract the relevant part of the receipt (items, prices, etc.)
    let relevantReceiptDict = cutReceipt(cleanReceiptDict);
    console.log(relevantReceiptDict);
    // relevantReceiptDict = removeKgPriceRows(relevantReceiptDict);
 
    // Step 4: Extract the total sum from the receipt
    const receiptSum = extractSum(relevantReceiptDict);

    if (!relevantReceiptDict || getDictLength(relevantReceiptDict) === 0) {
        throw new Error('Unable to process the receipt.');
    }

    // Step 5: Create and return a new receipt object
    const receipt = new Receipt(store, date, receiptSum);
    receipt.setReceiptItemsDict(relevantReceiptDict);

    return receipt;
}

/**
 * Processes the receipt items for a given receipt.
 * Different processing logic can be applied based on the store (e.g., Kaufland, Lidl).
 * @param {Object} receipt - A Receipt object containing the store, date, and items.
 */
export function processReceiptItems(receipt) {
    const receiptDict = receipt.receiptItemsDict;

    // Copy original receipt dict
    let receiptOnlyItemsDict = {...receiptDict};

    // Remove non-item-related rows from the receipt
    receiptOnlyItemsDict = removeDiscountRows(receiptOnlyItemsDict);
    receiptOnlyItemsDict = removeSpecialInfoRows(receiptOnlyItemsDict);
    receiptOnlyItemsDict = removeSummeRow(receiptOnlyItemsDict);

    console.log(receiptOnlyItemsDict);

    let receiptItems = [];

    // Process items differently based on the store
    switch (receipt.store) {
        case "Kaufland":
            // Dont remove the kg info rows, as they contain the price
            receiptItems = createReceiptItemsKaufland(receiptOnlyItemsDict);
            break;
        case "Lidl":
            receiptOnlyItemsDict = removeKgPriceRows(receiptOnlyItemsDict);
            receiptItems = createReceiptItemsLidlEdeka(receiptOnlyItemsDict);
            break;
        case "Edeka":
            receiptOnlyItemsDict = removeKgPriceRows(receiptOnlyItemsDict);
            receiptItems = createReceiptItemsLidlEdeka(receiptOnlyItemsDict);
            break;
        case "Netto":
            receiptOnlyItemsDict = removeKgPriceRows(receiptOnlyItemsDict);
            receiptItems = createReceiptItemsNetto(receiptOnlyItemsDict);
            break
        default:
            receiptItems = createReceiptItemsLidlEdeka(receiptOnlyItemsDict);
            console.log("Store yet to be processed, using default method");
    }

    if (receiptItems.length === 0) {
        throw new Error('No Items found in the receipt.');
    }

    // Apply the discounts
    const receiptDiscount = extractDiscountRows(receiptDict);
    receiptItems = applyDiscounts(receiptItems, receiptDiscount);
    console.log(receiptItems); 

    addCategories(receiptItems);

    // TODO
    // Categories (fuzzy matching, possible weight adjustments)
    // Pfandrückgabe Lidl, ...(?) adjustment // CHECK for Lidl, waiting if there are also more stores with that logic
    // Errors/Edge Cases
    // !Split File into sub files for better readability and maintainability (e.g. ReceiptModel.js, ReceiptProcessing.js, CategoryMatching.js)
    // Testing

    return receiptItems;
}

/**
 * Class representing a receipt.
 * Contains store, date, sum, receipt items, and a unique ID.
 */
class Receipt {
    constructor(store, date, receiptSum) {
        this.id = this.#generateID(); // Generate a unique ID
        this.store = store;
        this.date = date;
        this.receiptSum = receiptSum;
        this.receiptItems = []; // List of ReceiptItem objects
        this.receiptItemsDict = {}; // Raw dictionary of receipt items
    }

    // Private method to generate a unique ID based on the current timestamp
    #generateID() {
        return Date.now();
    }

    setReceiptItem(items) {
        this.receiptItems = items;
    }

    addReceiptItem(item) {
        this.receiptItems.push(item);
    }

    setReceiptItemsDict(dict) {
        this.receiptItemsDict = dict;
    }

    getId() {
        return this.id;
    }
}

/**
 * Class representing an item on a receipt.
 * Each item contains an index, name, price, amount, and optional category.
 */
class ReceiptItem {
    constructor(index, name, price, amount) {
        this.index = index;
        this.name = name;
        this.price = price || 0; // Default price to 0 if unknown
        this.amount = amount || 1; // Default amount to 1 if unknown
        this.category = '';
    }

    // Apply a discount to the price (e.g. -0,60)
    applyDiscount(discount) {
        discount = discount/this.amount;
        if (discount > 0) {
            console.log("Invalid Discount amount!");
        }
        this.price = Number((this.price + discount).toFixed(2));
    }

    setCategory(category) {
        this.category = category;
    }

    // Get the total price for this item (price * amount)
    getTotal() {
        if (this.amount === 0){
            return this.price;
        }
        return this.price * this.amount;
    }
}


/**
 * Categorizes receipt items by matching them to predefined categories using fuzzy matching.
 * @param {Array} receiptItems - List of receipt items, each with a `name` property.
 * @returns {void}
 */
function addCategories(receiptItems) {
    // Retrieve pre-defined categories
    const categories = getCategories();
    // Initialize variables for distance and matching category
    let distance = Infinity;
    let matching_key = '';
    let matching_value = '';

    // Loop through each item in the receipt
    for (let i = 0; i < receiptItems.length; i++) {
        let current_item_name = receiptItems[i].name;
        
        // Replace store-specific name parts (e.g., "KLC", "G&G")
        const possible_prefixes = getPossibleStoreSpecificNamePrefixes();
        current_item_name = replaceFromLookupArray(current_item_name, possible_prefixes);

        // Convert the item name to lowercase for case-insensitive matching
        current_item_name = current_item_name.toLowerCase();

        // Loop through each category
        for (let key in categories) {
            // Loop through each item in the category
            for (let j = 0; j < categories[key].length; j++) {
                // Get the category item in lowercase
                let category_item = categories[key][j].toLowerCase();

                // Perform fuzzy matching between the item name and category item
                const new_distance = fuzzyMatch(current_item_name, category_item);

                // Update matching category if a closer match (lower distance) is found
                if (new_distance < distance) {
                    matching_key = key;
                    matching_value = categories[key][j];
                    distance = new_distance;
                }
            }
        }

        // Log the current item name, matching category, matching item, and distance
        console.log(current_item_name, matching_key, matching_value, distance);

        // Reset matching variables for the next item
        matching_key = '';
        matching_value = '';
        distance = Infinity;
    }
}


/**
 * Creates receipt items from the processed Lidl/Edeka receipt dictionary.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt items after filtering.
 * @returns {Array<ReceiptItem>} - The created array of receipt items.
 */
function createReceiptItemsLidlEdeka(receiptOnlyItemsDict) {
    const items = [];

    let pfandrückgabe_row = false; // Flag for Pfandrückgabe rows
    let last_total_price = 0;
    let last_key = 0;

    for (let key in receiptOnlyItemsDict) {
        if(receiptOnlyItemsDict[key].length < 2){
            //Can't extract an item here
            continue;
        }
        const last_index = receiptOnlyItemsDict[key].length - 1;
        const last_elem = receiptOnlyItemsDict[key][last_index];
        const second_last_elem = receiptOnlyItemsDict[key][last_index-1];

        // Regular row
        if(convertToNumber(last_elem)){
            const total_price = convertToNumber(last_elem);

            // Row after Pfandrückgabe (Lidl-specific logic)
            if (pfandrückgabe_row){
                const name= "Pfandrückgabe";
                const single_price = convertToNumber(last_elem);
                const amount = Number((last_total_price / single_price).toFixed(2));
                const item = new ReceiptItem(convertToNumber(key),name,single_price,amount);
                items.push(item);
                pfandrückgabe_row = false;
                continue;
            }
            // Regular multiple items row
            if(convertToNumber(second_last_elem)){
                const amount = convertToNumber(second_last_elem);
                const single_price = Number((total_price/amount).toFixed(2));
                // Determine the amount of elements to leave out for the name
                let elems_to_leave_out = 0;
                const third_last_elem = receiptOnlyItemsDict[key][last_index-2];
                if(third_last_elem === "x" || third_last_elem === "X"){
                    elems_to_leave_out = 4;
                }
                else{
                    elems_to_leave_out = 3;
                }
                const name = concatenatItemNameString(receiptOnlyItemsDict[key], elems_to_leave_out);

                const item = new ReceiptItem(convertToNumber(key),name,single_price,amount);
                items.push(item);
                continue;
            }
            // Check if Pfandrückgabe (Lidl-specific logic)
            if(convertToNumber(last_elem) < 0 && second_last_elem.includes("Pfand")){
                pfandrückgabe_row = true;
                last_total_price = total_price;
                last_key = convertToNumber(key);
                continue;

            }
            // Single items
            else{
                const name = concatenatItemNameString(receiptOnlyItemsDict[key], 1);
                const item = new ReceiptItem(convertToNumber(key),name,total_price,1);
                items.push(item);
            }
            
        }
        // Error handling
        if(pfandrückgabe_row && !convertToNumber(last_elem)){
            // Reset flag if no number is found, so that flag is not set indefinetely
            // Only if the the loop is already at the next row
            if(convertToNumber(key)!==last_key){
                pfandrückgabe_row = false;
            }
        }
    }

    return(items);
}

/**
 * Creates receipt items from the processed Netto receipt dictionary.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt items after filtering.
 * @returns {Array<ReceiptItem>} - The created array of receipt items.
 */
function createReceiptItemsNetto(receiptOnlyItemsDict) {
    const items = [];
    let only_amount_row = false; // Flag for amount-only rows
    let last_single_price = 0;

    for (let key in receiptOnlyItemsDict) {
        if (receiptOnlyItemsDict[key].length < 2) {
            // Can't extract an item here
            continue;
        }

        const last_index = receiptOnlyItemsDict[key].length - 1;
        const last_elem = receiptOnlyItemsDict[key][last_index];
        const second_last_elem = receiptOnlyItemsDict[key][last_index - 1];
        const lastElemNumber = convertToNumber(last_elem);

        // Regular row: Handle single quantity items, can't have ONLY an amount identifier
        if (!only_amount_row && lastElemNumber && !(/^[0-9]*[xX]$/.test(second_last_elem))) {
            const single_price = lastElemNumber;
            const name = concatenatItemNameString(receiptOnlyItemsDict[key], 1);

            // Create a new receipt item for single items
            const item = new ReceiptItem(convertToNumber(key), name, single_price, 1);
            items.push(item);
        }

        // Row after multiple items: Handle the row with the total price
        if (only_amount_row && lastElemNumber) {
            const total_price = lastElemNumber;  // This is the total price
            const amount = Number((total_price / last_single_price).toFixed(2));  // Calculate the quantity
            const name = concatenatItemNameString(receiptOnlyItemsDict[key], 1);  // Concatenate the item name

            // Create a new receipt item
            const item = new ReceiptItem(convertToNumber(key), name, last_single_price, amount);
            items.push(item);

            // Reset the state after processing
            last_single_price = 0;
            only_amount_row = false;
        }

        // Multiple Items: Handle items with multiple quantities (e.g., 3x, X, 3X)
        if (lastElemNumber && (/^[0-9]*[xX]$/.test(second_last_elem)) && second_last_elem.length <=3) {
            last_single_price = lastElemNumber;  // Set the price for one unit
            only_amount_row = true;
        }
    }

    return items;
}


/**
 * Creates receipt items from the processed Kaufland receipt dictionary.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt items after filtering.
 * @returns {Array<ReceiptItem>} - The created array of receipt items.
 */
function createReceiptItemsKaufland(receiptOnlyItemsDict) {
    const items = [];
    let only_name_row = false; // Flag for name-only rows
    let last_name = '';
    let last_key = '';

    for (let key in receiptOnlyItemsDict) {
        const last_index = receiptOnlyItemsDict[key].length - 1;
        const last_elem = receiptOnlyItemsDict[key][last_index];

        // Check if the last element is a number and if there is no pending name-only item
        if (convertToNumber(last_elem) && !only_name_row) {
            const name = concatenatItemNameString(receiptOnlyItemsDict[key], 1);
            const price = convertToNumber(last_elem);
            const amount = 1;

            const item = new ReceiptItem(convertToNumber(key), name, price, amount);
            items.push(item);
            continue; // Move to the next key
        }

        // Handle name-only rows (no price in the row)
        if (!convertToNumber(last_elem) && !only_name_row) {
            only_name_row = true;
            last_name = concatenatItemNameString(receiptOnlyItemsDict[key], 0);
            last_key = convertToNumber(key);
            continue;
        }

        // Handle rows after encountering a name-only row, must include '*' or 'kg'
        if (only_name_row) {
            // Rows containing '*'(multiples)
            if (receiptOnlyItemsDict[key].some(item => /\*/.test(item))) {
                const item = createItemMultipleKaufland(last_key, last_name, receiptOnlyItemsDict[key]);
                items.push(item);
            }
            // Rows containing 'kg' (price per kilogram)
            if(receiptOnlyItemsDict[key].some(item => /kg/.test(item))){
                // Last elem is number?
                if(convertToNumber(last_elem)){
                    const item = new ReceiptItem(last_key, last_name, convertToNumber(last_elem), 1);
                    items.push(item);
                }
                // Default item if no valid numbers are found
                else{
                    const item = new ReceiptItem(last_key, last_name, 0, 1);
                    items.push(item);
                }
            }

            only_name_row = false; // Reset the flag after processing
        }
    }

    return(items);
}

/**
 * Creates a receipt item for multiple quantities of an item (Kaufland-specific logic).
 * @param {Number} last_key - The key of the last item.
 * @param {string} last_name - The name of the last item.
 * @param {Array} row - The row array representing the item data.
 * @returns {ReceiptItem} - The created receipt item.
 */
function createItemMultipleKaufland(last_key, last_name, row) {
    const cleanRow = row.filter(item => item !== ' '); // Remove empty spaces from the row
    const last_index = cleanRow.length - 1;

    if (convertToNumber(cleanRow[last_index]) && convertToNumber(cleanRow[last_index - 1])) {
        const total_price = convertToNumber(cleanRow[last_index]);
        const single_price = convertToNumber(cleanRow[last_index - 1]);
        const amount = total_price / single_price;

        // Check if the amount is an integer and if it's contained in the first element of the row
        if (Number.isInteger(amount) && cleanRow[0].includes(amount.toString())) {
            return new ReceiptItem(last_key, last_name, single_price, amount);
        }

        // If amount is not an integer or not contained in the first element, return item with amount 1
        return new ReceiptItem(last_key, last_name, single_price, 1);
    }

    // Default item if no valid numbers are found
    return new ReceiptItem(last_key, last_name, 0, 1);
}


/**
 * Extracts the discount containing rows and saves the amount corresponding to the row key
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Discount Rows.
 */
function extractDiscountRows(receiptDict) {
    const possible_discounts = getPossibleDiscounts();
    const discount_rows = {};

    // Loop through the receipt to find and remove discount rows
    for (let key in receiptDict) {
        const last_index = receiptDict[key].length -1;
        for (let i = 0; i < receiptDict[key].length; i++) {
            for (let j = 0; j < possible_discounts.length; j++) {
                if (receiptDict[key][i].includes(possible_discounts[j])) {
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
 * Search the previous row to the discount key, and apply the discount amount to that receiptItem
 * @param {Array} receiptDict - ReceiptItems.
 * @param {Object} receiptDict - Dictionary of discount rows.
 * @returns {Array} - ReceiptItems with discounts applied.
 */
function applyDiscounts(receiptItems, receiptDiscount) {
    for (let key in receiptDiscount) {
        const discountValue = convertToNumber(receiptDiscount[key]); // Get the discount amount
        const discountIndex = parseInt(key, 10); // Parse the key as an index

        let possible_item = null;

        // Loop through the receipt items to find the item with the highest index less than the discount index
        for (let i = 0; i < receiptItems.length; i++) {
            if (receiptItems[i].index < discountIndex) {
                if (!possible_item || receiptItems[i].index > possible_item.index) {
                    possible_item = receiptItems[i];
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
 * Cleans the receipt dictionary by removing unnecessary elements such as ' ' or ''.
 * Removes elements from the beginning and end of rows, as well as short elements (less than 3 characters).
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - Cleaned receipt dictionary.
 */
function cleanRows(receiptDict) {
    // Remove ' ' and '' from the start of each row
    for (let key in receiptDict) {
        for (let i = 0; i < receiptDict[key].length; i++) {
            if (!(receiptDict[key][i] === ' ' || receiptDict[key][i] === '')) break;
            receiptDict[key].splice(i, 1);
            i--; // Adjust index after removal
        }
    }

    // Remove elements from the end of the row if they have less than 3 digits, 'A', or 'B' or 'D'
    for (let key in receiptDict) {
        for (let i = receiptDict[key].length - 1; i >= 0; i--) {
            const current_element = receiptDict[key][i];
            if (receiptDict[key].length === 1) continue; // Skip single-element rows
            if (current_element === 'A' || current_element === 'B' || current_element === 'D' || current_element.length < 3) {
                receiptDict[key].splice(i, 1);
            } else {
                break; // Stop once a valid element is found
            }
        }
    }

    // Remove ' ' and '' from the end of each row
    for (let key in receiptDict) {
        for (let i = receiptDict[key].length - 1; i >= 0; i--) {
            if (!(receiptDict[key][i] === ' ' || receiptDict[key][i] === '')) break;
            receiptDict[key].splice(i, 1);
            i++; // Adjust index after removal
        }
    }

    for (let key in receiptDict) {
        // Get the last element
        let lastElement = String(receiptDict[key][receiptDict[key].length - 1]);
    
        // Replace patterns like *A, *B, +*A, +*B (also replace OCR reading errors)
        lastElement = lastElement
            .replace("+*A", "")
            .replace("+*B", "")
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

/**
 * Extracts the store name from the receipt.
 * Matches store identifiers against a list of possible stores.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {string} - The store name if found, otherwise default to 'Kaufland'.
 */
function extractStore(receiptDict) {
    const possible_stores = getPossibleStores();

    // Loop through all rows of the receipt
    for (let key in receiptDict) {
        // Loop through every word in the row
        for (let i = 0; i < receiptDict[key].length; i++) {
            // Loop through every possible store
            for (let store in possible_stores) {
                // Loop through every possible store identifier
                for (let j = 0; j < possible_stores[store].length; j++) {
                    if (receiptDict[key][i].includes(possible_stores[store][j])) {
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
function extractDate(receiptDict) {
    // Date pattern: DD.MM.YY or DD.MM.YYYY
    const datePattern = /\b(\d{2})[.\-/](\d{2})[.\-/](\d{2}|\d{4})\b/;

    for (let key in receiptDict) {
        // Loop through every word in the row
        for (let i = 0; i < receiptDict[key].length; i++) {
            // Check if datePattern appears somewhere in the string
            const date_text = receiptDict[key][i].match(datePattern);
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
 * Removes irrelevant rows from the receipt (e.g., headers, footers).
 * Focuses on keeping the relevant part of the receipt (items and prices).
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The cut receipt dictionary with only relevant content.
 */
function cutReceipt(receiptDict) {
    const possible_starts = getPossibleStarts(); // Start points for relevant data
    const possible_ends = getPossibleEnds(); // End points for relevant data

    // Helper function to find the start or end index
    function getEditIndex(dictToSearch) {
        for (let key in receiptDict) {
            for (let i = 0; i < receiptDict[key].length; i++) {
                if (!/^[a-zA-Z]+$/.test(receiptDict[key][i])) {
                    continue; // Skip if the element is not only letters
                }
                for (let j = 0; j < dictToSearch.length; j++) {
                    if (receiptDict[key][i].includes(dictToSearch[j])) {
                        return key; // Return the first occurrence
                    }
                }
            }
        }
        // Default to -1 if no match is found
        return -1;
    }

    const start_index = getEditIndex(possible_starts); // Get starting index
    let end_index = getEditIndex(possible_ends); // Get ending index
    let tempDict = receiptDict;

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
 * Extracts the sum (total amount) from the receipt.
 * Typically found at the bottom of the receipt.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {number|null} - The extracted sum, or null if no sum is found.
 */
function extractSum(receiptDict) {
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

/**
 * Removes rows containing price per kilogram (e.g., "/kg").
 * These rows typically represent unit prices and not total prices.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The cleaned receipt dictionary with /kg rows removed.
 */
function removeKgPriceRows(receiptDict) {
    const remove_keys = [];

    // Find rows that contain "/kg"
    for (let key in receiptDict) {
        for (let i = 0; i < receiptDict[key].length; i++) {
            if (receiptDict[key][i].includes("/kg")) {
                remove_keys.push(key);
            }
        }
    }

    // Remove rows that were marked for deletion
    for (let i = 0; i < remove_keys.length; i++) {
        delete receiptDict[remove_keys[i]];
    }

    return receiptDict;
}

/**
 * Removes discount-related rows from the receipt (e.g., "Rabatt").
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - The receipt dictionary with discount rows removed.
 */
function removeDiscountRows(receiptDict) {
    const possible_discounts = getPossibleDiscounts();

    // Remove rows that contain any of the possible discount terms
    const cleaned_dict = removeRowsMatchedWithValues(receiptDict, possible_discounts);

    return cleaned_dict
}


/**
 * Removes rows containing special info (e.g. additional info) from the receipt.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt data focusing only on item rows.
 * @returns {Object} - A new dictionary with rows containing special info removed.
 */
function removeSpecialInfoRows(receiptDict){
    const possible_special_info = getPossibleSpecialInfo();
    
    // Remove rows that contain any of the possible special info terms
    const cleaned_dict = removeRowsMatchedWithValues(receiptDict, possible_special_info);

    return cleaned_dict

}


/**
 * Removes the row containing the a possible receipt end (e.g. "Summe") from the receipt, which usually is the last row.
 * @param {Object} receiptDict - Dictionary of receipt data.
 * @returns {Object} - A new dictionary with the row removed or unchanged dict if the end couldn'nt be located.
 */
function removeSummeRow(receiptDict) {
    const index = getMaxDictKey(receiptDict); // Get the key with the highest value (last row)
    if (index === 0) {
        return receiptDict; // If no rows exist, return null
    }

    const last_row_arr = receiptDict[index]; // Get the last row based on the index
    if (doesRowContainEnd(last_row_arr)) { // Check if the row contains the "Summe" keyword
        delete receiptDict[index]; // Delete the row if it contains the end keyword
    }

    return receiptDict; // Return the updated dictionary without the "Summe" row
}

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
function removeRowsMatchedWithValues(receiptDict, possibleValues) {
    // Loop through the receipt rows
    for (let key in receiptDict) {
        // Loop through the values in each row
        for (let i = 0; i < receiptDict[key].length; i++) {
            // Check if any of the possible values match the row's contents
            for (let j = 0; j < possibleValues.length; j++) {
                if (receiptDict[key][i].includes(possibleValues[j])) {
                    delete receiptDict[key]; // Remove the entire row (key) if a match is found
                    break; // Break out of the loop once a match is found
                }
            }
            if (!receiptDict.hasOwnProperty(key)) break; // Exit loop if row was deleted
        }
    }
    return receiptDict; // Return the updated dictionary with rows removed
}

/**
 * Returns a dictionary of possible store names and their corresponding identifiers.
 * @returns {Object} - Dictionary of store names and their associated keywords.
 */
function getPossibleStores() {
    return {
        "Kaufland": ["Kaufland", "KAUFLAND", "KLC", "Bergsteig", "09621/78260"],
        "Lidl": ["Lidl", "LIDL", "Barbarastr", "Hirschauer", "L4DL", "L$DE", "Lid)", "Li1dl"],
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
    for (let key in possible_stores) {
        possible_store_keys.push(key); // Add each store key (name) to the array
    }

    return possible_store_keys; // Return the array of store keys
}

/**
 * Returns a list of possible receipt start indicators (e.g., "EUR", "Preis EUR").
 * These help identify where the relevant receipt content begins.
 * @returns {Array} - Array of possible receipt start strings.
 */
function getPossibleStarts() {
    return ["EUR", "Preis EUR", "PREIS", "Preis"];
}

/**
 * Returns a list of possible receipt end indicators (e.g., "SUMME", "zu zahlen").
 * These help identify where the relevant receipt content ends.
 * @returns {Array} - Array of possible receipt end strings.
 */
function getPossibleEnds() {
    return ["SUMME", "Summe", "zu zahlen", "Zu Zahlen", "Zahlen", "zahlen", "SUNNE"];
}

/**
 * Returns a list of possible discount-related keywords (e.g., "Rabatt", "Extrapunkte").
 * These help identify rows in the receipt that indicate discounts.
 * @returns {Array} - Array of possible discount keywords.
 */
function getPossibleDiscounts() {
    return ["Rabatt", "RABATT", "Rebatt"];
}

/**
 * Returns a list of possible special-info keywords (e.g., "Zusatzpunkte").
 * These help identify rows in the receipt that loyalty points.
 * @returns {Array} - Array of possible special info keywords.
 */
function getPossibleSpecialInfo() {
    return ["Zusatzpunkte", "Willkommensrabatt", "sparen"];
}


/**
 * Returns a list of possible store specific name prefixes (e.g., "KLC.", "G&G_").
 * These help identify and remove store-specific parts from the item names.
 * @returns {Array} - Array of possible store-specific name prefixes.
 */
function getPossibleStoreSpecificNamePrefixes(){
    // Add store-specific name prefixes here
    // Order of Items is **RELEVANT** because of the order of the replace function
    return ["KLC.", "KLC ", "KLC", "G&G_", "G&G"];
}

/**
 * Gets the number of keys in the dictionary (i.e., the number of rows in the receipt).
 * @param {Object} dict - The dictionary to count keys from.
 * @returns {number} - The number of keys in the dictionary.
 */
function getDictLength(dict) {
    return Object.keys(dict).length;
}

/**
 * Converts a value to a number, handling special cases like comma instead of a decimal point.
 * Rounds the result to two decimal places.
 * @param {string} value - The value to convert to a number.
 * @returns {number|null} - The converted number, or null if conversion fails.
 */
function convertToNumber(value) {
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
function replaceFromLookupArray(str, array){
    // Lopp through the array and replace each element
    for (let i = 0; i < array.length; i++) {
        str = str.replace(array[i], "");
    }
    return str;
}

/**
 * Checks if a row contains any possible end indicators (e.g., "SUMME", "zu zahlen").
 * This helps identify the total sum row in the receipt.
 * @param {Array} row - The row to check for end indicators.
 * @returns {boolean} - True if the row contains an end indicator, false otherwise.
 */
function doesRowContainEnd(row) {
    const possible_ends = getPossibleEnds();
    for (let end of possible_ends) {
        for (let str of row) {
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
 * @returns {number} - The highest numeric key, or 0 if no keys are found.
 */
function getMaxDictKey(dict) {
    if (!dict || Object.keys(dict).length === 0) {
        return 0;
    }

    let maxKey = Object.keys(dict)
        .map(key => Number(key)) // Convert keys to numbers
        .reduce((a, b) => a > b ? a : b); // Find the largest key

    return maxKey;
}

/**
 * Concatenates item name from the row by excluding empty spaces.
 * @param {Array} row - Array of strings representing a row of the receipt.
 * @param {number} last_index - Index of the last element in the row.
 * @returns {string} - The concatenated item name.
 */
function concatenatItemNameString(row, elems_to_leave_out) {
    if (row.length === 0) return '';
    if (row.length === 1) return row[0];

    let name_str = '';
    // Delete all whitespaces from name so that both pdf and img is equal
    const cleanRow = row.filter(item => item !== ' ');

    // Declare loop stop as length - elements set to leave at the row end
    let last_index = cleanRow.length;
    last_index = last_index - elems_to_leave_out;

    for (let i = 0; i < last_index; i++) {
        name_str = name_str + cleanRow[i] + ' ';
    }

    return name_str.trim();
}