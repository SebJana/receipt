import { Receipt, ReceiptItem } from "./receiptModel.js";
import { cleanRows } from "./receiptDataCleaning.js";
import { extractStore, extractDate, extractSum, extractDiscountRows } from "./receiptDataExtraction.js";
import { cutReceipt, removeKgPriceRows, removeDiscountRows, removeSpecialInfoRows, removeSummeRow, applyDiscounts} from "./receiptDataManipulation.js";	
import { createReceiptItemsKaufland, createReceiptItemsLidlEdeka, createReceiptItemsNetto } from "./receiptDictToReceiptItems.js";
import { addCategories } from "../categoryMatching/matchCategories.js";

import { getDictLength } from "./utilities.js";

import * as XLSX from 'xlsx';

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

    console.log(receiptDict);

    // Step 1: Clean the rows by removing irrelevant data (e.g., ' ' and '' elements)
    const cleanReceiptDict = cleanRows(receiptDict);

    // Step 2: Extract the store name and date from the receipt
    const store = extractStore(cleanReceiptDict);
    const date = extractDate(cleanReceiptDict);

    // Step 3: Extract the relevant part of the receipt (items, prices, etc.)
    let relevantReceiptDict = cutReceipt(cleanReceiptDict);
    console.log(relevantReceiptDict);
 
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
 * @param {Array<ReceiptItem>} receiptItems - A Receipt object containing the store, date, and items.
 * @throws Will throw an error if there are no receipt items in the receiptDict.
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
            console.log("Store yet to be processed, using default function (Lidl/Edeka)");
    }

    if (receiptItems.length === 0) {
        throw new Error('No Items found in the receipt.');
    }   

    // Apply the discounts
    const receiptDiscount = extractDiscountRows(receiptDict);
    applyDiscounts(receiptItems, receiptDiscount);
    console.log(receiptItems); 

    // Add the categories to the receipt items, mutates the receiptItems array
    addCategories(receiptItems);

    generateExcelFile(receiptItems, receipt.getId());
    

    // TODO
    // Reading in the receipt example files and testing them automatically, also using that for the creation of the categories
    // Categories (fuzzy matching DONE, possible weight adjustments), adding more possible identifiers to the categories
    // Refactoring the code, making it more modular, adding more comments, especially for receiptDictToReceiptItems.js
    // Pfandrückgabe Lidl, ...(?) adjustment // DONE for Lidl, waiting if there are also more stores with that logic

    // BACKLOG: imageExtraction (OCR) improvement, adding categories matching AI (brain.js)

    // Errors/Edge Cases
    // Testing (unit tests, integration tests)

    return receiptItems;
}


/**
 * Generates an Excel file and fills one column with the 'name' property of objects in the array.
 * @param {Array<Object>} dataArray - Array of objects with a 'name' property to fill in the first column of the Excel file.
 * @param {string} fileName - The name of the generated Excel file.
 */
function generateExcelFile(dataArray, fileName) {
    // Step 1: Create a new workbook and worksheet
    const wb = XLSX.utils.book_new(); // Create a new workbook
    const ws = XLSX.utils.aoa_to_sheet([]); // Create an empty worksheet

    // Step 2: Fill the first column with the 'name' property from the objects in dataArray
    dataArray.forEach((obj, index) => {
        if (obj?.name) {
            ws[`A${index + 1}`] = { t: 's', v: obj.name }; // Fill column A with the 'name' property
        } else {
            ws[`A${index + 1}`] = { t: 's', v: 'Unnamed' }; // Handle missing names with a default value
        }
    });

    // Step 3: Set the range of the worksheet
    ws['!ref'] = `A1:A${dataArray.length}`; // Set the range (from A1 to the last row with data)

    // Step 4: Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Step 5: Generate a binary Excel file and trigger a download
    XLSX.writeFile(wb, `${fileName}.xlsx`); // Export the workbook to a file
}
