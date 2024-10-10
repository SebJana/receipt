import { ReceiptItem } from "./receiptModel.js";
import { convertToNumber, concatenatItemNameString } from "./utilities.js";

/**
 * Creates receipt items from the processed Lidl/Edeka receipt dictionary.
 * @param {Object} receiptOnlyItemsDict - Dictionary of receipt items after filtering.
 * @returns {Array<ReceiptItem>} - The created array of receipt items.
 */
export function createReceiptItemsLidlEdeka(receiptOnlyItemsDict) {
    const items = [];

    let pfandrückgabe_row = false; // Flag for Pfandrückgabe rows
    let last_total_price = 0;
    let last_key = 0;

    for (const key in receiptOnlyItemsDict) {
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
export function createReceiptItemsNetto(receiptOnlyItemsDict) {
    const items = [];
    let only_amount_row = false; // Flag for amount-only rows
    let last_single_price = 0;

    for (const key in receiptOnlyItemsDict) {
        if (receiptOnlyItemsDict[key].length < 2) {
            // Can't extract an item here
            continue;
        }

        const last_index = receiptOnlyItemsDict[key].length - 1;
        const last_elem = receiptOnlyItemsDict[key][last_index];
        const second_last_elem = receiptOnlyItemsDict[key][last_index - 1];
        const lastElemNumber = convertToNumber(last_elem);

        // Regular row: Handle single quantity items, can't have ONLY an amount identifier
        if (!only_amount_row && lastElemNumber && !(/^\d*[xX]$/.test(second_last_elem))) {
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
        if (lastElemNumber && (/^\d*[xX]$/.test(second_last_elem)) && second_last_elem.length <=3) {
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
export function createReceiptItemsKaufland(receiptOnlyItemsDict) {
    const items = [];
    let only_name_row = false; // Flag for name-only rows
    let last_name = '';
    let last_key = '';

    for (const key in receiptOnlyItemsDict) {
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